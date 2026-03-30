import { fastify } from "fastify";
import { prisma } from "./lib/prisma.js";
import { request as httpRequest } from "undici";

const port = Number(process.env.PORT ?? 50052);
const host = process.env.HOST ?? "0.0.0.0";
const routingMlUrl = process.env.ROUTING_ML_URL ?? "http://routing-ml:8000";

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  },
});

// Create route with stops
app.post("/routes", async (req, reply) => {
  const input = req.body as {
    driverId: string;
    depotLat: number;
    depotLng: number;
    totalDistanceKm?: number;
    totalDurationMin?: number;
    confidenceScore?: number;
    stops: Array<{ orderId: string; sequence: number; eta?: string }>;
  };

  const route = await prisma.route.create({
    data: {
      driverId: input.driverId,
      depotLat: input.depotLat,
      depotLng: input.depotLng,
      totalDistanceKm: input.totalDistanceKm,
      totalDurationMin: input.totalDurationMin,
      confidenceScore: input.confidenceScore,
      stops: {
        create: input.stops.map((s) => ({
          orderId: s.orderId,
          sequence: s.sequence,
          eta: s.eta ? new Date(s.eta) : null,
        })),
      },
    },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });

  return reply.code(201).send(route);
});

// Get route
app.get("/routes/:id", async (req) => {
  const { id } = req.params as { id: string };
  return prisma.route.findUnique({
    where: { id },
    include: {
      driver: true,
      stops: { include: { order: true }, orderBy: { sequence: "asc" } },
    },
  });
});

// List routes
app.get("/routes", async (req) => {
  const { driverId, status } = req.query as { driverId?: string; status?: string };
  return prisma.route.findMany({
    where: {
      ...(driverId && { driverId }),
      ...(status && { status: status as "PLANNED" | "ACTIVE" | "COMPLETED" }),
    },
    include: {
      driver: { select: { id: true, name: true } },
      stops: { orderBy: { sequence: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
});

// Update route status
app.patch("/routes/:id/status", async (req) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string };
  return prisma.route.update({
    where: { id },
    data: { status: status as "PLANNED" | "ACTIVE" | "COMPLETED" },
  });
});

// Call ML service for route optimization
app.post("/optimize", async (req, reply) => {
  const payload = req.body;
  try {
    const { body } = await httpRequest(`${routingMlUrl}/api/route/optimize`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    });
    return body.json();
  } catch (error) {
    app.log.error(error, "Routing ML service call failed");
    return reply.code(502).send({ error: "UPSTREAM_ERROR" });
  }
});

app.get("/health", async () => ({ status: "ok", service: "route-service" }));

try {
  await app.listen({ port, host });
  app.log.info(`🗺️  Route Service running on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
