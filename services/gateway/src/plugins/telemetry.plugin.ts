import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

// ─── In-process metrics store (Prometheus-compatible) ───
const metrics = {
  httpRequestsTotal: new Map<string, number>(),
  httpRequestDuration: new Map<string, number[]>(),
  httpErrors: new Map<string, number>(),
  activeConnections: 0,
  wsConnections: 0,
};

function incCounter(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordDuration(map: Map<string, number[]>, key: string, ms: number) {
  const arr = map.get(key) ?? [];
  arr.push(ms);
  // Keep last 1000 entries to prevent memory leak
  if (arr.length > 1000) arr.shift();
  map.set(key, arr);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function telemetryPlugin(app: FastifyInstance) {
  // ─── Request Tracking Hooks ───
  app.addHook("onRequest", async (request: FastifyRequest) => {
    metrics.activeConnections++;
    (request as { _startTime?: bigint })._startTime = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    metrics.activeConnections--;

    const startTime = (request as { _startTime?: bigint })._startTime;
    if (startTime) {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      const key = `${request.method} ${request.routeOptions?.url ?? request.url}`;
      incCounter(metrics.httpRequestsTotal, key);
      recordDuration(metrics.httpRequestDuration, key, durationMs);

      if (reply.statusCode >= 400) {
        incCounter(metrics.httpErrors, `${reply.statusCode} ${key}`);
      }
    }
  });

  // ─── Prometheus-compatible /metrics endpoint ───
  app.get("/metrics", async (_request, reply) => {
    const lines: string[] = [];

    // HTTP requests total
    lines.push("# HELP http_requests_total Total number of HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, count] of metrics.httpRequestsTotal) {
      const [method, path] = key.split(" ");
      lines.push(`http_requests_total{method="${method}",path="${path}"} ${count}`);
    }

    // HTTP request duration
    lines.push("# HELP http_request_duration_ms HTTP request duration in milliseconds");
    lines.push("# TYPE http_request_duration_ms summary");
    for (const [key, durations] of metrics.httpRequestDuration) {
      const [method, path] = key.split(" ");
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.5"} ${percentile(durations, 50).toFixed(2)}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.95"} ${percentile(durations, 95).toFixed(2)}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.99"} ${percentile(durations, 99).toFixed(2)}`);
      lines.push(`http_request_duration_ms_avg{method="${method}",path="${path}"} ${avg.toFixed(2)}`);
    }

    // HTTP errors
    lines.push("# HELP http_errors_total Total number of HTTP error responses");
    lines.push("# TYPE http_errors_total counter");
    for (const [key, count] of metrics.httpErrors) {
      const parts = key.split(" ");
      const status = parts[0];
      const method = parts[1];
      const path = parts.slice(2).join(" ");
      lines.push(`http_errors_total{status="${status}",method="${method}",path="${path}"} ${count}`);
    }

    // Active connections
    lines.push("# HELP http_active_connections Currently active HTTP connections");
    lines.push("# TYPE http_active_connections gauge");
    lines.push(`http_active_connections ${metrics.activeConnections}`);

    // WebSocket connections (if Socket.IO is available)
    if (app.io) {
      const trackingCount = app.io.of("/tracking").sockets.size;
      const notificationsCount = app.io.of("/notifications").sockets.size;
      const dashboardCount = app.io.of("/dashboard").sockets.size;

      lines.push("# HELP ws_connections Active WebSocket connections by namespace");
      lines.push("# TYPE ws_connections gauge");
      lines.push(`ws_connections{namespace="/tracking"} ${trackingCount}`);
      lines.push(`ws_connections{namespace="/notifications"} ${notificationsCount}`);
      lines.push(`ws_connections{namespace="/dashboard"} ${dashboardCount}`);
    }

    // Process metrics
    const mem = process.memoryUsage();
    lines.push("# HELP process_heap_bytes Process heap memory in bytes");
    lines.push("# TYPE process_heap_bytes gauge");
    lines.push(`process_heap_bytes ${mem.heapUsed}`);
    lines.push(`process_heap_total_bytes ${mem.heapTotal}`);
    lines.push(`process_rss_bytes ${mem.rss}`);

    lines.push("# HELP process_uptime_seconds Process uptime in seconds");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

    reply.type("text/plain; version=0.0.4; charset=utf-8");
    return lines.join("\n") + "\n";
  });

  app.log.info("📈 Telemetry plugin loaded — metrics at /metrics");
}

export default fp(telemetryPlugin, {
  name: "telemetry",
  fastify: "5.x",
});
