import { builder } from "../builder.js";

// ─── Analytics Summary Type ───
const AnalyticsTotals = builder.objectRef<{
  orders: number;
  delivered: number;
  failed: number;
  pending: number;
  inTransit: number;
  assigned: number;
}>("AnalyticsTotals");

builder.objectType(AnalyticsTotals, {
  fields: (t) => ({
    orders: t.exposeInt("orders"),
    delivered: t.exposeInt("delivered"),
    failed: t.exposeInt("failed"),
    pending: t.exposeInt("pending"),
    inTransit: t.exposeInt("inTransit"),
    assigned: t.exposeInt("assigned"),
  }),
});

const AnalyticsRates = builder.objectRef<{
  deliverySuccessRate: number;
  avgDriverSuccessRate: number;
}>("AnalyticsRates");

builder.objectType(AnalyticsRates, {
  fields: (t) => ({
    deliverySuccessRate: t.exposeFloat("deliverySuccessRate"),
    avgDriverSuccessRate: t.exposeFloat("avgDriverSuccessRate"),
  }),
});

const AnalyticsRisk = builder.objectRef<{
  low: number;
  medium: number;
  high: number;
}>("AnalyticsRisk");

builder.objectType(AnalyticsRisk, {
  fields: (t) => ({
    low: t.exposeInt("low"),
    medium: t.exposeInt("medium"),
    high: t.exposeInt("high"),
  }),
});

const AnalyticsSummary = builder.objectRef<{
  totals: { orders: number; delivered: number; failed: number; pending: number; inTransit: number; assigned: number };
  rates: { deliverySuccessRate: number; avgDriverSuccessRate: number };
  risk: { low: number; medium: number; high: number };
}>("AnalyticsSummary");

builder.objectType(AnalyticsSummary, {
  fields: (t) => ({
    totals: t.field({ type: AnalyticsTotals, resolve: (parent) => parent.totals }),
    rates: t.field({ type: AnalyticsRates, resolve: (parent) => parent.rates }),
    risk: t.field({ type: AnalyticsRisk, resolve: (parent) => parent.risk }),
  }),
});

// ─── Query ───
builder.queryField("analyticsSummary", (t) =>
  t.field({
    type: AnalyticsSummary,
    authScopes: { authenticated: true },
    resolve: async (_parent, _args, ctx) => {
      const [totalOrders, statusCounts, riskCounts, avgSuccessRate] = await Promise.all([
        ctx.prisma.order.count(),
        ctx.prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
        ctx.prisma.order.groupBy({ by: ["riskTier"], _count: { id: true } }),
        ctx.prisma.driver.aggregate({ _avg: { successRate: true } }),
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
    },
  })
);
