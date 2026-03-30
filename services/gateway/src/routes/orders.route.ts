import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/guards.js";
import { NotFoundError, formatError } from "../utils/errors.js";

// ─── Validation Schemas ───

const createOrderSchema = z.object({
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  locationType: z.enum(["RESIDENTIAL", "COMMERCIAL"]),
  timePreference: z.enum(["ASAP", "SCHEDULED"]),
  scheduledTime: z.string().datetime().optional(),
});

const listOrdersQuery = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"]).optional(),
  riskTier: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  zoneId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"]),
});

// ─── Routes ───

export async function orderRoutes(app: FastifyInstance) {
  // Create order
  app.post(
    "/api/orders",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const input = createOrderSchema.parse(req.body);

      const order = await prisma.order.create({
        data: {
          recipientName: input.recipientName,
          rawAddress: input.address,
          locationType: input.locationType,
          timePreference: input.timePreference,
          scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
        },
        include: {
          zone: true,
          assignedDriver: true,
        },
      });

      return reply.code(201).send({ data: order });
    }
  );

  // List orders (paginated + filtered)
  app.get(
    "/api/orders",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const query = listOrdersQuery.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const where = {
        ...(query.status && { status: query.status }),
        ...(query.riskTier && { riskTier: query.riskTier }),
        ...(query.zoneId && { zoneId: query.zoneId }),
      };

      const [items, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: "desc" },
          include: {
            zone: true,
            assignedDriver: { select: { id: true, name: true } },
          },
        }),
        prisma.order.count({ where }),
      ]);

      return {
        data: items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Get single order
  app.get(
    "/api/orders/:id",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { id } = req.params as { id: string };

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          zone: true,
          assignedDriver: true,
          routeStops: { include: { route: true } },
          events: { orderBy: { timestamp: "desc" }, take: 20 },
        },
      });

      if (!order) throw new NotFoundError("Order", id);
      return { data: order };
    }
  );

  // Update order status
  app.patch(
    "/api/orders/:id/status",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { id } = req.params as { id: string };
      const { status } = updateOrderStatusSchema.parse(req.body);

      const existing = await prisma.order.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Order", id);

      const order = await prisma.order.update({
        where: { id },
        data: {
          status,
          completedAt: ["DELIVERED", "FAILED"].includes(status) ? new Date() : undefined,
        },
        include: { zone: true, assignedDriver: true },
      });

      // Log event
      await prisma.deliveryEvent.create({
        data: {
          orderId: id,
          eventType: status === "DELIVERED" ? "DELIVERED" : status === "FAILED" ? "FAILED" : "RISK_FLAGGED",
          payload: { previousStatus: existing.status, newStatus: status },
        },
      });

      return { data: order };
    }
  );
}
