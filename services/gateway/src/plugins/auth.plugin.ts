import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { auth, type AuthSession } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

// Extend Fastify types to include session on request
declare module "fastify" {
  interface FastifyRequest {
    session: AuthSession | null;
  }
}

async function authPlugin(app: FastifyInstance) {
  // ─── Mount Better Auth catch-all handler ───
  app.all("/api/auth/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    const response = await auth.handler(
      new Request(url.toString(), {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        body: request.method !== "GET" && request.method !== "HEAD"
          ? JSON.stringify(request.body)
          : undefined,
      })
    );

    // Forward response headers
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    reply.code(response.status);
    const body = await response.text();
    return reply.send(body);
  });

  // ─── Decorate request with session resolver ───
  app.decorateRequest("session", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    // Skip auth resolution for public routes only
    const publicPaths = ["/api/auth/", "/api/health", "/metrics"];
    if (publicPaths.some((p) => request.url.startsWith(p))) {
      return;
    }

    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      request.session = session;
    } catch {
      request.session = null;
    }
  });
}

export default fp(authPlugin, {
  name: "auth",
  fastify: "5.x",
});
