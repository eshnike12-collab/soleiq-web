export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DEPENDENCY_ERROR"
  | "INTERNAL_ERROR";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const unauthorized = (message = "Authentication required") =>
  new DomainError("UNAUTHENTICATED", message, 401);
export const forbidden = (message = "Access denied") =>
  new DomainError("FORBIDDEN", message, 403);
export const notFound = (message = "Resource not found") =>
  new DomainError("NOT_FOUND", message, 404);
export const invalid = (message: string, details?: unknown) =>
  new DomainError("VALIDATION_ERROR", message, 400, details);
export const conflict = (message: string) =>
  new DomainError("CONFLICT", message, 409);

