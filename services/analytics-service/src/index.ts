import { fastify } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const port = Number(process.env.PORT ?? 50054);
const host = process.env.HOST ?? "0.0.0.0";

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  },
});

// Analytics summary
app.get("/summary", async () => {
  const [totalOrders, statusCounts, riskCounts, avgSuccessRate] = await Promise.all([
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.groupBy({ by: ["riskTier"], _count: { id: true } }),
    prisma.driver.aggregate({ _avg: { successRate: true } }),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
  const byRisk = Object.fromEntries(
    riskCounts.filter((r) => r.riskTier !== null).map((r) => [r.riskTier!, r._count.id])
  );

  const delivered = byStatus["DELIVERED"] ?? 0;
  const failed = byStatus["FAILED"] ?? 0;
  const successRate = delivered + failed > 0 ? delivered / (delivered + failed) : 1;

  return {
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
  };
});

// Zone summary
app.get("/zones", async () => {
  return prisma.zone.findMany({
    select: {
      id: true,
      name: true,
      failureRate: true,
      _count: { select: { orders: true } },
    },
    orderBy: { failureRate: "desc" },
  });
});

// Recent events
app.get("/events", async (req) => {
  const { limit } = req.query as { limit?: string };
  return prisma.deliveryEvent.findMany({
    orderBy: { timestamp: "desc" },
    take: Number(limit ?? 20),
    include: { order: { select: { id: true, recipientName: true } } },
  });
});

app.get("/health", async () => ({ status: "ok", service: "analytics-service" }));

try {
  await app.listen({ port, host });
  app.log.info(`📊 Analytics Service running on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
