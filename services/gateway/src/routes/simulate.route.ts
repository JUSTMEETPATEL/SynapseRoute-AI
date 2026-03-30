import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/guards.js";

export async function simulateRoutes(app: FastifyInstance) {
  // Advance simulation by one tick — moves all ON_ROUTE drivers
  app.get(
    "/api/simulate/tick",
    { preHandler: [requireAuth, requireRole("ADMIN", "DISPATCHER")] },
    async () => {
      const activeDrivers = await prisma.driver.findMany({
        where: { status: "ON_ROUTE" },
        include: {
          routes: {
            where: { status: "ACTIVE" },
            include: {
              stops: {
                where: { status: "PENDING" },
                orderBy: { sequence: "asc" },
                take: 1,
                include: { order: true },
              },
            },
          },
        },
      });

      const events: Array<{
        driverId: string;
        action: string;
        orderId?: string;
      }> = [];

      for (const driver of activeDrivers) {
        const activeRoute = driver.routes[0];
        if (!activeRoute || activeRoute.stops.length === 0) {
          // No more stops — mark driver as idle
          await prisma.driver.update({
            where: { id: driver.id },
            data: { status: "IDLE", activeRouteId: null },
          });
          events.push({ driverId: driver.id, action: "route_completed" });
          continue;
        }

        const nextStop = activeRoute.stops[0];

        // Simulate movement toward next stop
        if (nextStop.order.lat && nextStop.order.lng) {
          const newLat = driver.currentLat! + (nextStop.order.lat - driver.currentLat!) * 0.3;
          const newLng = driver.currentLng! + (nextStop.order.lng - driver.currentLng!) * 0.3;

          await prisma.driver.update({
            where: { id: driver.id },
            data: { currentLat: newLat, currentLng: newLng },
          });
        }

        // Check if driver is "close enough" to mark delivery
        const dist = Math.sqrt(
          Math.pow((driver.currentLat ?? 0) - (nextStop.order.lat ?? 0), 2) +
          Math.pow((driver.currentLng ?? 0) - (nextStop.order.lng ?? 0), 2)
        );

        if (dist < 0.002) {
          // Simulate delivery outcome based on risk
          const failureProb = nextStop.order.failureProb ?? 0;
          const succeeded = Math.random() > failureProb;

          await prisma.routeStop.update({
            where: { id: nextStop.id },
            data: { status: succeeded ? "COMPLETED" : "FAILED", arrivedAt: new Date() },
          });

          await prisma.order.update({
            where: { id: nextStop.orderId },
            data: { status: succeeded ? "DELIVERED" : "FAILED", completedAt: new Date() },
          });

          await prisma.deliveryEvent.create({
            data: {
              orderId: nextStop.orderId,
              eventType: succeeded ? "DELIVERED" : "FAILED",
              payload: { driverId: driver.id, simulation: true },
            },
          });

          events.push({
            driverId: driver.id,
            action: succeeded ? "delivery_completed" : "delivery_failed",
            orderId: nextStop.orderId,
          });
        } else {
          events.push({
            driverId: driver.id,
            action: "moving",
            orderId: nextStop.orderId,
          });
        }
      }

      return {
        data: {
          tickAt: new Date().toISOString(),
          driversProcessed: activeDrivers.length,
          events,
        },
      };
    }
  );
}
