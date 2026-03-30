export const config = {
  // Server
  port: Number(process.env.GATEWAY_PORT ?? 3001),
  host: process.env.GATEWAY_HOST ?? "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Auth
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",

  // Redis
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",

  // ML Services (HTTP)
  routingMlUrl: process.env.ROUTING_ML_URL ?? "http://localhost:8000",
  predictorUrl: process.env.PREDICTOR_URL ?? "http://localhost:8001",

  // gRPC Services (ConnectRPC)
  orderServiceUrl: process.env.ORDER_SERVICE_URL ?? "http://localhost:50051",
  routeServiceUrl: process.env.ROUTE_SERVICE_URL ?? "http://localhost:50052",
  driverServiceUrl: process.env.DRIVER_SERVICE_URL ?? "http://localhost:50053",
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:50054",

  // Observability
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;
