import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { AppError, formatError } from "./utils/errors.js";

// Plugins
import authPlugin from "./plugins/auth.plugin.js";
import graphqlPlugin from "./plugins/graphql.plugin.js";
import realtimePlugin from "./plugins/realtime.plugin.js";
import telemetryPlugin from "./plugins/telemetry.plugin.js";

// REST Routes
import { healthRoutes } from "./routes/health.route.js";
import { orderRoutes } from "./routes/orders.route.js";
import { driverRoutes } from "./routes/drivers.route.js";
import { routeRoutes } from "./routes/routes.route.js";
import { predictRoutes, geocodeRoutes } from "./routes/predict.route.js";
import { analyticsRoutes } from "./routes/analytics.route.js";
import { simulateRoutes } from "./routes/simulate.route.js";

// ─── Bootstrap ───

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === "production"
        ? undefined
        : { target: "pino-pretty", options: { colorize: true } },
  },
  genReqId: () => crypto.randomUUID(),
});

// ─── Global Plugins ───

await app.register(cors, {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  allowList: ["127.0.0.1", "::1"],
});

// ─── Telemetry (before auth so all requests are tracked) ───
await app.register(telemetryPlugin);

// ─── Auth (must be before routes) ───
await app.register(authPlugin);

// ─── REST Routes ───
await app.register(healthRoutes);
await app.register(orderRoutes);
await app.register(driverRoutes);
await app.register(routeRoutes);
await app.register(predictRoutes);
await app.register(geocodeRoutes);
await app.register(analyticsRoutes);
await app.register(simulateRoutes);

// ─── GraphQL ───
await app.register(graphqlPlugin);

// ─── Real-Time (Socket.IO) ───
await app.register(realtimePlugin);

// ─── Global Error Handler ───

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send(formatError(error));
  }

  if (error instanceof Error && error.name === "ZodError") {
    return reply.code(400).send(formatError(error));
  }

  // Rate limit error
  if (error instanceof Error && "statusCode" in error && (error as { statusCode?: number }).statusCode === 429) {
    return reply.code(429).send({
      error: "RATE_LIMITED",
      message: "Too many requests. Please slow down.",
    });
  }

  app.log.error(error);
  return reply.code(500).send({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
});

// ─── Not Found Handler ───
app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({
    error: "NOT_FOUND",
    message: "The requested endpoint does not exist",
  });
});

// ─── Start ───

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`🚀 Gateway running at http://${config.host}:${config.port}`);
  app.log.info(`📊 GraphQL IDE at http://localhost:${config.port}/graphql`);
  app.log.info(`🔐 Auth API at http://localhost:${config.port}/api/auth`);
  app.log.info(`🔌 WebSocket at ws://localhost:${config.port} (tracking, notifications, dashboard)`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
