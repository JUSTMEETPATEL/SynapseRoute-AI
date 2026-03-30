import { createConnectRouter } from "@connectrpc/connect";
import { prisma } from "../lib/prisma.js";

/**
 * Order Service — gRPC/ConnectRPC handler
 *
 * NOTE: Once proto codegen is run (via `buf generate`), this handler
 * will import the generated service definition and implement typed RPCs.
 *
 * For now, this is a functional placeholder that will be wired up after
 * running `npm run proto:generate` from the project root.
 *
 * The handler pattern will look like:
 *
 * ```ts
 * import { OrderService } from "@synapseroute/proto/gen/synapseroute/v1/order_connect";
 *
 * export const orderRouter = (router: ConnectRouter) => {
 *   router.service(OrderService, {
 *     async createOrder(req) { ... },
 *     async getOrder(req) { ... },
 *     async listOrders(req) { ... },
 *     async updateOrderStatus(req) { ... },
 *     async updateOrderRisk(req) { ... },
 *   });
 * };
 * ```
 */

// Placeholder — direct Prisma queries for all order operations
export const orderHandlers = {
  async createOrder(input: {
    recipientName: string;
    rawAddress: string;
    locationType: string;
    timePreference: string;
    scheduledTime?: Date;
  }) {
    return prisma.order.create({
      data: {
        recipientName: input.recipientName,
        rawAddress: input.rawAddress,
        locationType: input.locationType === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL",
        timePreference: input.timePreference === "SCHEDULED" ? "SCHEDULED" : "ASAP",
        scheduledTime: input.scheduledTime,
      },
    });
  },

  async getOrder(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        zone: true,
        assignedDriver: true,
        routeStops: { orderBy: { sequence: "asc" } },
        events: { orderBy: { timestamp: "desc" }, take: 20 },
      },
    });
  },

  async listOrders(filters: {
    status?: string;
    riskTier?: string;
    zoneId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.status && { status: filters.status as "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED" }),
      ...(filters.riskTier && { riskTier: filters.riskTier as "LOW" | "MEDIUM" | "HIGH" }),
      ...(filters.zoneId && { zoneId: filters.zoneId }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { zone: true, assignedDriver: { select: { id: true, name: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async updateOrderStatus(id: string, status: string) {
    return prisma.order.update({
      where: { id },
      data: {
        status: status as "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED",
        completedAt: ["DELIVERED", "FAILED"].includes(status) ? new Date() : undefined,
      },
    });
  },

  async updateOrderRisk(id: string, failureProb: number, riskTier: string) {
    return prisma.order.update({
      where: { id },
      data: {
        failureProb,
        riskTier: riskTier as "LOW" | "MEDIUM" | "HIGH",
      },
    });
  },
};
