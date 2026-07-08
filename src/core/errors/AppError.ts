export type ErrorCode =
  | "AUTH_UNAUTHORIZED"
  | "AUTH_FORBIDDEN"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "PAYMENT_FAILED"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "QUOTA_EXCEEDED"
  | "FEATURE_DISABLED";

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(ctx: ErrorContext) {
    super(ctx.message);
    this.name = "AppError";
    this.code = ctx.code;
    this.status = ctx.status;
    this.details = ctx.details;
    this.retryable = ctx.retryable ?? false;
    this.timestamp = new Date().toISOString();
  }

  static unauthorized(msg = "Authentication required.") {
    return new AppError({ code: "AUTH_UNAUTHORIZED", message: msg, status: 401 });
  }

  static forbidden(msg = "You do not have permission.") {
    return new AppError({ code: "AUTH_FORBIDDEN", message: msg, status: 403 });
  }

  static notFound(msg = "Resource not found.") {
    return new AppError({ code: "NOT_FOUND", message: msg, status: 404 });
  }

  static conflict(msg = "Resource already exists.") {
    return new AppError({ code: "CONFLICT", message: msg, status: 409 });
  }

  static validation(msg: string, details?: Record<string, unknown>) {
    return new AppError({ code: "VALIDATION_ERROR", message: msg, status: 400, details });
  }

  static rateLimited(msg = "Too many requests.") {
    return new AppError({ code: "RATE_LIMITED", message: msg, status: 429, retryable: true });
  }

  static internal(msg = "An unexpected error occurred.") {
    return new AppError({ code: "INTERNAL_ERROR", message: msg, status: 500 });
  }

  static externalService(service: string, msg?: string) {
    return new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      message: msg || `${service} returned an error.`,
      status: 502,
      details: { service },
      retryable: true,
    });
  }

  toResponse(): { error: { code: ErrorCode; message: string; details?: Record<string, unknown> } } {
    if (this.status >= 500) {
      return { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } };
    }
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}
