/** Structured error responses for the API */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, "NOT_FOUND", `${resource} with id '${id}' not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(503, "SERVICE_UNAVAILABLE", `Upstream service '${service}' is unavailable`);
  }
}

export function formatError(error: unknown): {
  error: string;
  message: string;
  details?: unknown;
} {
  if (error instanceof AppError) {
    return {
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  }

  if (error instanceof Error && error.name === "ZodError") {
    return {
      error: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: error.message,
    };
  }

  return {
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  };
}
