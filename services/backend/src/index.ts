import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { request } from "undici";
import { config } from "./config.js";
import { createOrder, listOrders, updateOrder } from "./modules/store.js";
import {
  createOrderSchema,
  geocodeSchema,
  optimizeRouteSchema,
  predictSchema
} from "./modules/schemas.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" }
  }
});

await app.register(cors, { origin: true });

app.get("/api/health", async () => {
  return {
    status: "ok",
    services: {
      backend: "up",
      routingMl: config.routingMlUrl,
      predictor: config.predictorUrl,
      redis: config.redisUrl
    }
  };
});

app.post("/api/orders", async (req: FastifyRequest, reply: FastifyReply) => {
  const payload = createOrderSchema.parse(req.body);
  const order = createOrder(payload);
  return reply.code(201).send(order);
});

app.get("/api/orders", async () => {
  return { items: listOrders() };
});

app.post("/api/geocode", async (req: FastifyRequest) => {
  const { address } = geocodeSchema.parse(req.body);
  return {
    address,
    lat: 13.0827,
    lng: 80.2707,
    zoneId: "chennai-central"
  };
});

app.post("/api/predict", async (req: FastifyRequest) => {
  const payload = predictSchema.parse(req.body);
  const { body } = await request(`${config.predictorUrl}/predict`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" }
  });
  return body.json();
});

app.post("/api/route/optimize", async (req: FastifyRequest) => {
  const payload = optimizeRouteSchema.parse(req.body);
  const { body } = await request(`${config.routingMlUrl}/api/route/optimize`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" }
  });
  return body.json();
});

app.get("/api/simulate/tick", async () => {
  return {
    tickAt: new Date().toISOString(),
    movedDrivers: 2,
    event: "simulation_advanced"
  };
});

app.post("/api/route/reroute", async (req: FastifyRequest) => {
  const payload = optimizeRouteSchema.parse(req.body);
  return {
    driverId: payload.driverId,
    status: "rerouted",
    reason: "high-risk-stop-detected"
  };
});

app.get("/api/track", async () => {
  return {
    drivers: [
      { id: "driver-1", lat: 13.0832, lng: 80.2751, status: "on_route" },
      { id: "driver-2", lat: 13.0745, lng: 80.2634, status: "on_route" }
    ]
  };
});

app.get("/api/analytics/summary", async () => {
  const items = listOrders();
  const failed = items.filter((order) => order.status === "failed").length;
  return {
    totals: {
      orders: items.length,
      failed,
      successRate: items.length === 0 ? 1 : (items.length - failed) / items.length
    }
  };
});

app.post("/internal/orders/:id/risk", async (req: FastifyRequest, reply: FastifyReply) => {
  const id = (req.params as { id: string }).id;
  const score = Number((req.body as { riskScore?: number }).riskScore ?? 0);
  const updated = updateOrder(id, { riskScore: score });
  if (!updated) {
    return reply.code(404).send({ message: "Order not found" });
  }
  return { ok: true, order: updated };
});

app.setErrorHandler((error: Error, _req: FastifyRequest, reply: FastifyReply) => {
  if (error.name === "ZodError") {
    return reply.code(400).send({ message: "Validation failed", details: error.message });
  }
  app.log.error(error);
  return reply.code(500).send({ message: "Unexpected error" });
});

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
