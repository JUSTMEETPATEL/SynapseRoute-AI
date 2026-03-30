import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/guards.js";
import { config } from "../config.js";
import { request as httpRequest } from "undici";

const optimizeRouteSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
  driverIds: z.array(z.string().uuid()).min(1),
  depotLat: z.number(),
  depotLng: z.number(),
});

const rerouteSchema = z.object({
  driverId: z.string().uuid(),
  reason: z.enum(["high_risk_stop", "delivery_failed", "traffic_delay", "cancellation"]).optional(),
});

export async function routeRoutes(app: FastifyInstance) {
  // Optimize routes for a batch of orders
  app.post(
    "/api/route/optimize",
    { preHandler: [requireAuth, requireRole("ADMIN", "DISPATCHER")] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const input = optimizeRouteSchema.parse(req.body);

      // Fetch orders with coordinates
      const orders = await prisma.order.findMany({
        where: { id: { in: input.orderIds } },
        include: { zone: true },
      });

      // Build payload for ML service
      const mlPayload = {
        order_ids: input.orderIds,
        driver_ids: input.driverIds,
        depot_coords: [input.depotLat, input.depotLng],
        stops: orders.map((o) => ({
          order_id: o.id,
          lat: o.lat,
          lng: o.lng,
          risk_score: o.failureProb ?? 0,
        })),
      };

      try {
        // Call Routing ML microservice
        const { body } = await httpRequest(`${config.routingMlUrl}/api/route/optimize`, {
          method: "POST",
          body: JSON.stringify(mlPayload),
          headers: { "content-type": "application/json" },
        });
        const mlResult = (await body.json()) as {
          routes: Array<{
            driver_id: string;
            stops: Array<{ order_id: string; sequence: number; eta: string }>;
            total_distance_km: number;
            total_duration_min: number;
            confidence_score?: number;
          }>;
        };

        // Persist routes in the database
        const createdRoutes = await Promise.all(
          mlResult.routes.map(async (mlRoute) => {
            return prisma.route.create({
              data: {
                driverId: mlRoute.driver_id,
                depotLat: input.depotLat,
                depotLng: input.depotLng,
                totalDistanceKm: mlRoute.total_distance_km,
                totalDurationMin: mlRoute.total_duration_min,
                confidenceScore: mlRoute.confidence_score,
                status: "PLANNED",
                stops: {
                  create: mlRoute.stops.map((stop) => ({
                    orderId: stop.order_id,
                    sequence: stop.sequence,
                    eta: new Date(stop.eta),
                  })),
                },
              },
              include: { stops: { include: { order: true }, orderBy: { sequence: "asc" } } },
            });
          })
        );

        // Update driver active route + order assignments
        await Promise.all(
          createdRoutes.map(async (route) => {
            await prisma.driver.update({
              where: { id: route.driverId },
              data: { activeRouteId: route.id, status: "ON_ROUTE" },
            });

            await prisma.order.updateMany({
              where: { id: { in: route.stops.map((s) => s.orderId) } },
              data: { status: "ASSIGNED", assignedDriverId: route.driverId },
            });
          })
        );

        return reply.code(201).send({ data: { routes: createdRoutes } });
      } catch (error) {
        app.log.error(error, "Route optimization failed");
        return reply.code(502).send({
          error: "UPSTREAM_ERROR",
          message: "Route optimization service unavailable",
        });
      }
    }
  );

  // Trigger re-route for a specific driver
  app.post(
    "/api/route/reroute",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const input = rerouteSchema.parse(req.body);

      const driver = await prisma.driver.findUnique({
        where: { id: input.driverId },
        include: {
          routes: {
            where: { status: "ACTIVE" },
            include: { stops: { where: { status: "PENDING" }, orderBy: { sequence: "asc" } } },
          },
        },
      });

      if (!driver) {
        return { error: "NOT_FOUND", message: "Driver not found" };
      }

      // Log the reroute event for all pending orders
      const activeRoute = driver.routes[0];
      if (activeRoute) {
        await Promise.all(
          activeRoute.stops.map((stop) =>
            prisma.deliveryEvent.create({
              data: {
                orderId: stop.orderId,
                eventType: "REROUTED",
                payload: { reason: input.reason ?? "manual", driverId: input.driverId },
              },
            })
          )
        );
      }

      return {
        data: {
          driverId: input.driverId,
          status: "rerouted",
          reason: input.reason ?? "manual",
          pendingStops: activeRoute?.stops.length ?? 0,
        },
      };
    }
  );

  // List routes
  app.get(
    "/api/routes",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { driverId, status } = req.query as { driverId?: string; status?: string };
      const routes = await prisma.route.findMany({
        where: {
          ...(driverId && { driverId }),
          ...(status && { status: status as "PLANNED" | "ACTIVE" | "COMPLETED" }),
        },
        include: {
          driver: { select: { id: true, name: true } },
          stops: { include: { order: true }, orderBy: { sequence: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { data: routes };
    }
  );
}
