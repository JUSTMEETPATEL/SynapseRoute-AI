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

      // Fetch orders with coordinates + zones
      const orders = await prisma.order.findMany({
        where: { id: { in: input.orderIds } },
        include: { zone: true },
      });

      // Build payload for ML service (matches new routing-ml API)
      const mlPayload = {
        stops: orders.map((o) => ({
          order_id: o.id,
          lat: o.lat ?? 0,
          lng: o.lng ?? 0,
          zone_id: o.zoneId ?? "default",
          risk_score: o.failureProb ?? 0,
        })),
        depot: { lat: input.depotLat, lng: input.depotLng },
        driver_ids: input.driverIds,
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
          model_used: string;
          computation_time_ms: number;
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

        return reply.code(201).send({
          data: {
            routes: createdRoutes,
            modelUsed: mlResult.model_used,
            computationTimeMs: mlResult.computation_time_ms,
          },
        });
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
  // Trigger re-route for a specific driver
  app.post(
    "/api/route/reroute",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const input = rerouteSchema.parse(req.body);

      const driver = await prisma.driver.findUnique({
        where: { id: input.driverId },
        include: {
          routes: {
            where: { status: "ACTIVE" },
            include: { stops: { orderBy: { sequence: "asc" }, include: { order: true } } },
          },
        },
      });

      if (!driver) {
        return reply.code(404).send({ error: "NOT_FOUND", message: "Driver not found" });
      }

      const activeRoute = driver.routes[0];
      if (!activeRoute) {
        return reply.code(400).send({ error: "NO_ACTIVE_ROUTE", message: "Driver has no active route to recalculate." });
      }

      const pendingStops = activeRoute.stops.filter(s => s.status === "PENDING" || s.status === "SKIPPED");
      const completedStops = activeRoute.stops.filter(s => s.status === "COMPLETED" || s.status === "FAILED");
      
      if (pendingStops.length < 2) {
        // Not enough stops to run TSP/ML
        return reply.code(400).send({ error: "TOO_FEW_STOPS", message: "Not enough pending stops to re-route." });
      }

      // We'll use the driver's current location as the start point, or fallback to the depot
      const depotLat = driver.currentLat ?? activeRoute.depotLat;
      const depotLng = driver.currentLng ?? activeRoute.depotLng;

      // Build payload for ML service
      const mlPayload = {
        stops: pendingStops.map((stop) => ({
          order_id: stop.orderId,
          lat: stop.order.lat ?? 0,
          lng: stop.order.lng ?? 0,
          zone_id: stop.order.zoneId ?? "default",
          risk_score: stop.order.failureProb ?? 0,
        })),
        depot: { lat: depotLat, lng: depotLng },
        driver_ids: [driver.id], // we only want to route this existing set of orders for this specific driver
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
          model_used: string;
          computation_time_ms: number;
        };

        const newRoutePlan = mlResult.routes[0];
        if (!newRoutePlan) throw new Error("No route returned from ML service");

        // We delete the PENDING stops and insert the newly sequenced ones. 
        // Sequence numbers will be shifted by the number of completed stops.
        const sequenceOffset = completedStops.length;

        await prisma.$transaction(async (tx) => {
          // Delete old pending stops
          await tx.routeStop.deleteMany({
            where: { routeId: activeRoute.id, status: { in: ["PENDING", "SKIPPED"] } }
          });

          // Insert newly sequenced pending stops
          await tx.route.update({
            where: { id: activeRoute.id },
            data: {
              totalDistanceKm: newRoutePlan.total_distance_km,
              totalDurationMin: newRoutePlan.total_duration_min,
              confidenceScore: newRoutePlan.confidence_score,
              stops: {
                create: newRoutePlan.stops.map((mlStop) => ({
                  orderId: mlStop.order_id,
                  sequence: mlStop.sequence + sequenceOffset, // append after completed stops
                  eta: new Date(mlStop.eta),
                  status: "PENDING",
                }))
              }
            }
          });

          // Log the reroute event for all affected orders
          await Promise.all(
            newRoutePlan.stops.map((stop) =>
              tx.deliveryEvent.create({
                data: {
                  orderId: stop.order_id,
                  eventType: "REROUTED",
                  payload: { reason: input.reason ?? "manual", driverId: input.driverId, modelUsed: mlResult.model_used },
                },
              })
            )
          );
        });

        // Broadcast to clients via WebSocket
        app.io.of("/dashboard").emit("route:update", {
          routeId: activeRoute.id,
          driverId: driver.id,
          reason: input.reason ?? "manual",
          timestamp: new Date().toISOString()
        });

        return reply.code(200).send({
          data: {
            driverId: input.driverId,
            status: "rerouted",
            reason: input.reason ?? "manual",
            pendingStops: newRoutePlan.stops.length,
            modelUsed: mlResult.model_used
          },
        });
      } catch (error) {
        app.log.error(error, "Route re-optimization failed");
        return reply.code(502).send({
          error: "UPSTREAM_ERROR",
          message: "Route optimization service unavailable for re-routing",
        });
      }
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
