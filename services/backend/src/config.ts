export const config = {
  port: Number(process.env.BACKEND_PORT ?? 3001),
  host: process.env.BACKEND_HOST ?? "0.0.0.0",
  routingMlUrl: process.env.ROUTING_ML_URL ?? "http://routing-ml:8000",
  predictorUrl: process.env.PREDICTOR_URL ?? "http://failure-predictor:8001",
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379"
};
