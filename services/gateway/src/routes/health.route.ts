import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    // Check database connectivity
    let dbStatus = "down";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "up";
    } catch {
      dbStatus = "down";
    }

    return {
      status: dbStatus === "up" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        gateway: "up",
        database: dbStatus,
        routingMl: process.env.ROUTING_ML_URL ?? "not configured",
        predictor: process.env.PREDICTOR_URL ?? "not configured",
      },
    };
  });
}
