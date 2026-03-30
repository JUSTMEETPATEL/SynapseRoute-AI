import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/guards.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    "/api/analytics/summary",
    { preHandler: [requireAuth] },
    async () => {
      const [
        totalOrders,
        statusCounts,
        riskCounts,
        avgSuccessRate,
        recentEvents,
        zoneSummary,
      ] = await Promise.all([
        // Total orders
        prisma.order.count(),

        // Orders by status
        prisma.order.groupBy({
          by: ["status"],
          _count: { id: true },
        }),

        // Orders by risk tier
        prisma.order.groupBy({
          by: ["riskTier"],
          _count: { id: true },
        }),

        // Average driver success rate
        prisma.driver.aggregate({
          _avg: { successRate: true },
        }),

        // Recent delivery events
        prisma.deliveryEvent.findMany({
          orderBy: { timestamp: "desc" },
          take: 10,
          include: { order: { select: { id: true, recipientName: true } } },
        }),

        // Zone failure summary
        prisma.zone.findMany({
          select: {
            id: true,
            name: true,
            failureRate: true,
            _count: { select: { orders: true } },
          },
          orderBy: { failureRate: "desc" },
        }),
      ]);

      // Build status map
      const byStatus = Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.id])
      );

      // Build risk map
      const byRisk = Object.fromEntries(
        riskCounts
          .filter((r) => r.riskTier !== null)
          .map((r) => [r.riskTier!, r._count.id])
      );

      const delivered = byStatus["DELIVERED"] ?? 0;
      const failed = byStatus["FAILED"] ?? 0;
      const successRate = delivered + failed > 0
        ? delivered / (delivered + failed)
        : 1;

      return {
        data: {
          totals: {
            orders: totalOrders,
            delivered,
            failed,
            pending: byStatus["PENDING"] ?? 0,
            inTransit: byStatus["IN_TRANSIT"] ?? 0,
            assigned: byStatus["ASSIGNED"] ?? 0,
          },
          rates: {
            deliverySuccessRate: Math.round(successRate * 10000) / 100,
            avgDriverSuccessRate: Math.round((avgSuccessRate._avg.successRate ?? 1) * 10000) / 100,
          },
          risk: {
            low: byRisk["LOW"] ?? 0,
            medium: byRisk["MEDIUM"] ?? 0,
            high: byRisk["HIGH"] ?? 0,
          },
          zones: zoneSummary.map((z) => ({
            id: z.id,
            name: z.name,
            failureRate: Math.round(z.failureRate * 100) / 100,
            orderCount: z._count.orders,
          })),
          recentEvents: recentEvents.map((e) => ({
            id: e.id,
            orderId: e.orderId,
            recipientName: e.order.recipientName,
            eventType: e.eventType,
            timestamp: e.timestamp,
            payload: e.payload,
          })),
        },
      };
    }
  );
}
