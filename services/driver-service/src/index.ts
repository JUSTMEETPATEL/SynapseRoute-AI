import { fastify } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const port = Number(process.env.PORT ?? 50053);
const host = process.env.HOST ?? "0.0.0.0";

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  },
});

// List drivers
app.get("/drivers", async (req) => {
  const { status } = req.query as { status?: string };
  return prisma.driver.findMany({
    where: status ? { status: status as "IDLE" | "ON_ROUTE" | "BREAK" } : {},
    orderBy: { name: "asc" },
  });
});

// Get driver
app.get("/drivers/:id", async (req) => {
  const { id } = req.params as { id: string };
  return prisma.driver.findUnique({
    where: { id },
    include: {
      orders: { where: { status: { in: ["ASSIGNED", "IN_TRANSIT"] } } },
      routes: { where: { status: "ACTIVE" }, include: { stops: { orderBy: { sequence: "asc" } } } },
    },
  });
});

// Create driver
app.post("/drivers", async (req, reply) => {
  const { name, lat, lng } = req.body as { name: string; lat?: number; lng?: number };
  const driver = await prisma.driver.create({
    data: { name, currentLat: lat, currentLng: lng },
  });
  return reply.code(201).send(driver);
});

// Update position
app.patch("/drivers/:id/position", async (req) => {
  const { id } = req.params as { id: string };
  const { lat, lng } = req.body as { lat: number; lng: number };
  return prisma.driver.update({
    where: { id },
    data: { currentLat: lat, currentLng: lng },
  });
});

// Update status
app.patch("/drivers/:id/status", async (req) => {
  const { id } = req.params as { id: string };
  const { status, activeRouteId } = req.body as { status: string; activeRouteId?: string };
  return prisma.driver.update({
    where: { id },
    data: {
      status: status as "IDLE" | "ON_ROUTE" | "BREAK",
      activeRouteId: activeRouteId ?? null,
    },
  });
});

// Get all positions (for tracking map)
app.get("/positions", async () => {
  return prisma.driver.findMany({
    where: { status: { not: "BREAK" } },
    select: { id: true, name: true, currentLat: true, currentLng: true, status: true },
  });
});

app.get("/health", async () => ({ status: "ok", service: "driver-service" }));

try {
  await app.listen({ port, host });
  app.log.info(`🚗 Driver Service running on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
