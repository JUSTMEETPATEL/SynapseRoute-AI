import { fastify } from "fastify";
import { orderHandlers } from "./handlers/order.handler.js";

const port = Number(process.env.PORT ?? 50051);
const host = process.env.HOST ?? "0.0.0.0";

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  },
});

/**
 * Order Service — gRPC Microservice
 *
 * Once ConnectRPC codegen is complete, this will serve:
 *   - ConnectRPC protocol on the same port
 *   - Full gRPC compatibility
 *
 * For now, serves a minimal HTTP API for internal use by the gateway.
 * This HTTP API mirrors the gRPC service contract and will be replaced
 * by ConnectRPC handlers once proto codegen is configured.
 */

// ─── Internal HTTP API (mirrors gRPC contract) ───

app.post("/orders", async (req, reply) => {
  const order = await orderHandlers.createOrder(req.body as {
    recipientName: string;
    rawAddress: string;
    locationType: string;
    timePreference: string;
  });
  return reply.code(201).send(order);
});

app.get("/orders/:id", async (req) => {
  const { id } = req.params as { id: string };
  const order = await orderHandlers.getOrder(id);
  if (!order) return { error: "NOT_FOUND" };
  return order;
});

app.get("/orders", async (req) => {
  const query = req.query as { status?: string; riskTier?: string; zoneId?: string; page?: string; limit?: string };
  return orderHandlers.listOrders({
    status: query.status,
    riskTier: query.riskTier,
    zoneId: query.zoneId,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  });
});

app.patch("/orders/:id/status", async (req) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string };
  return orderHandlers.updateOrderStatus(id, status);
});

app.patch("/orders/:id/risk", async (req) => {
  const { id } = req.params as { id: string };
  const { failureProb, riskTier } = req.body as { failureProb: number; riskTier: string };
  return orderHandlers.updateOrderRisk(id, failureProb, riskTier);
});

// ─── Health Check ───
app.get("/health", async () => ({ status: "ok", service: "order-service" }));

// ─── Start ───
try {
  await app.listen({ port, host });
  app.log.info(`📦 Order Service running on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
