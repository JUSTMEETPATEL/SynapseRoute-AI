import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/guards.js";
import { NotFoundError } from "../utils/errors.js";

const createDriverSchema = z.object({
  name: z.string().min(2),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
});

const updateDriverPositionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function driverRoutes(app: FastifyInstance) {
  // List all drivers
  app.get(
    "/api/drivers",
    { preHandler: [requireAuth] },
    async () => {
      const drivers = await prisma.driver.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { orders: true, routes: true } },
        },
      });
      return { data: drivers };
    }
  );

  // Get single driver with active route
  app.get(
    "/api/drivers/:id",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { id } = req.params as { id: string };
      const driver = await prisma.driver.findUnique({
        where: { id },
        include: {
          orders: { where: { status: { in: ["ASSIGNED", "IN_TRANSIT"] } } },
          routes: {
            where: { status: "ACTIVE" },
            include: { stops: { include: { order: true }, orderBy: { sequence: "asc" } } },
          },
        },
      });
      if (!driver) throw new NotFoundError("Driver", id);
      return { data: driver };
    }
  );

  // Create driver
  app.post(
    "/api/drivers",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const input = createDriverSchema.parse(req.body);
      const driver = await prisma.driver.create({ data: input });
      return reply.code(201).send({ data: driver });
    }
  );

  // Update driver position
  app.patch(
    "/api/drivers/:id/position",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { id } = req.params as { id: string };
      const { lat, lng } = updateDriverPositionSchema.parse(req.body);
      const driver = await prisma.driver.update({
        where: { id },
        data: { currentLat: lat, currentLng: lng },
      });
      return { data: driver };
    }
  );

  // Get all driver positions (for live tracking map)
  app.get(
    "/api/track",
    { preHandler: [requireAuth] },
    async () => {
      const drivers = await prisma.driver.findMany({
        where: { status: { not: "BREAK" } },
        select: {
          id: true,
          name: true,
          currentLat: true,
          currentLng: true,
          status: true,
          activeRouteId: true,
        },
      });
      return { data: drivers };
    }
  );
}
