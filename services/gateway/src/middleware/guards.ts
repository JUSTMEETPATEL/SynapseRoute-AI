import type { FastifyRequest, FastifyReply } from "fastify";
import type { UserRole } from "@prisma/client";

/**
 * Pre-handler: Rejects with 401 if no valid session exists.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.session?.user) {
    reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Authentication required. Please sign in.",
    });
    return;
  }
}

/**
 * Factory: Creates a pre-handler that rejects with 403
 * if the user's role is not in the allowed list.
 */
export function requireRole(...roles: UserRole[]) {
  return async function checkRole(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.session?.user) {
      reply.code(401).send({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
      return;
    }

    const userRole = (request.session.user as { role?: string }).role;
    if (!userRole || !roles.includes(userRole as UserRole)) {
      reply.code(403).send({
        error: "FORBIDDEN",
        message: `Requires one of: ${roles.join(", ")}`,
      });
      return;
    }
  };
}

/**
 * Utility to extract authenticated user ID from request.
 * Throws if no session (use after requireAuth).
 */
export function getUserId(request: FastifyRequest): string {
  const userId = request.session?.user?.id;
  if (!userId) {
    throw new Error("No authenticated user — guard not applied");
  }
  return userId;
}
