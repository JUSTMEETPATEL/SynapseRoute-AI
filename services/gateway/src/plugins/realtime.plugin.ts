import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

// Extend Fastify to carry the Socket.IO instance
declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

async function realtimePlugin(app: FastifyInstance) {
  // ─── Create Socket.IO Server ───
  const io = new Server(app.server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 10_000,
    pingTimeout: 5_000,
  });

  // ─── Redis Adapter for Horizontal Scaling ───
  try {
    const pubClient = new Redis(config.redisUrl);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    app.log.info("Socket.IO Redis adapter connected");
  } catch (error) {
    app.log.warn(error, "Redis adapter unavailable — running without pub/sub");
  }

  // ─── Auth Middleware ───
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const headers = new Headers();
      headers.set("cookie", cookieHeader);

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(Object.fromEntries(headers.entries())),
      });

      if (!session?.user) {
        return next(new Error("UNAUTHORIZED"));
      }

      // Attach user to socket data
      socket.data.userId = session.user.id;
      socket.data.userRole = (session.user as { role?: string }).role ?? "VIEWER";
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  // ═══════════════════════════════════════════════════════
  // Namespace: /tracking — Live driver positions
  // ═══════════════════════════════════════════════════════
  const trackingNs = io.of("/tracking");

  trackingNs.on("connection", (socket) => {
    app.log.info(`[tracking] Client connected: ${socket.id}`);

    // Join zone-based rooms
    socket.on("subscribe:zone", (zoneId: string) => {
      socket.join(`zone:${zoneId}`);
      app.log.debug(`[tracking] ${socket.id} subscribed to zone:${zoneId}`);
    });

    socket.on("unsubscribe:zone", (zoneId: string) => {
      socket.leave(`zone:${zoneId}`);
    });

    // Driver position update (from driver clients / simulation)
    socket.on("driver:position", (data: {
      driverId: string;
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
    }) => {
      // Broadcast to all tracking subscribers
      trackingNs.emit("driver:moved", {
        ...data,
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      app.log.debug(`[tracking] Client disconnected: ${socket.id}`);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Namespace: /notifications — Delivery events & alerts
  // ═══════════════════════════════════════════════════════
  const notificationsNs = io.of("/notifications");

  notificationsNs.on("connection", (socket) => {
    app.log.info(`[notifications] Client connected: ${socket.id}`);

    // Subscribe to specific order
    socket.on("subscribe:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("unsubscribe:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on("disconnect", () => {
      app.log.debug(`[notifications] Client disconnected: ${socket.id}`);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Namespace: /dashboard — Real-time analytics
  // ═══════════════════════════════════════════════════════
  const dashboardNs = io.of("/dashboard");

  dashboardNs.on("connection", (socket) => {
    app.log.info(`[dashboard] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      app.log.debug(`[dashboard] Client disconnected: ${socket.id}`);
    });
  });

  // ─── Decorate Fastify with IO ───
  app.decorate("io", io);

  // ─── Cleanup on shutdown ───
  app.addHook("onClose", async () => {
    io.close();
    app.log.info("Socket.IO server closed");
  });

  app.log.info("🔌 Real-time layer initialized (tracking, notifications, dashboard)");
}

export default fp(realtimePlugin, {
  name: "realtime",
  dependencies: ["auth"],
  fastify: "5.x",
});

// ═══════════════════════════════════════════════════════
// Emitter Helpers — Call from REST/GraphQL routes
// ═══════════════════════════════════════════════════════

/**
 * Emit a driver position update to all tracking subscribers.
 */
export function emitDriverPosition(io: Server, data: {
  driverId: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
}) {
  io.of("/tracking").emit("driver:moved", {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Emit a delivery event to order subscribers + dashboard.
 */
export function emitDeliveryEvent(io: Server, data: {
  orderId: string;
  eventType: string;
  recipientName: string;
  payload?: unknown;
}) {
  const event = { ...data, timestamp: Date.now() };

  // Notify order-specific subscribers
  io.of("/notifications").to(`order:${data.orderId}`).emit("delivery:event", event);

  // Broadcast to dashboard
  io.of("/dashboard").emit("delivery:event", event);
}

/**
 * Emit a risk alert for high-risk orders.
 */
export function emitRiskAlert(io: Server, data: {
  orderId: string;
  recipientName: string;
  failureProbability: number;
  riskTier: string;
  contributingFactors: string[];
}) {
  io.of("/notifications").emit("risk:alert", {
    ...data,
    timestamp: Date.now(),
  });

  io.of("/dashboard").emit("risk:alert", {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Emit updated analytics to the dashboard.
 */
export function emitAnalyticsUpdate(io: Server, summary: unknown) {
  io.of("/dashboard").emit("analytics:update", {
    data: summary,
    timestamp: Date.now(),
  });
}
