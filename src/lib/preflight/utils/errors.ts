import type { Result } from "@agent-preflight/types";

export interface AppErrorOptions {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  retryable?: boolean;
  cause?: Error;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;
  public readonly retryable: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status ?? 500;
    this.details = options.details;
    this.retryable = options.retryable ?? false;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function createError(
  code: string,
  message: string,
  overrides: Partial<AppErrorOptions> = {},
): AppError {
  return new AppError({
    code,
    message,
    ...overrides,
  });
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export interface FormattedError {
  code: string;
  message: string;
  status: number;
  details: unknown;
  retryable: boolean;
  stack?: string | undefined;
}

export function formatError(error: unknown): FormattedError {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
      retryable: error.retryable,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message,
      status: 500,
      details: undefined,
      retryable: false,
      stack: error.stack,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(error),
    status: 500,
    details: error,
    retryable: false,
    stack: undefined,
  };
}

export function errorToResult<T>(error: unknown): Result<T> {
  const formatted = formatError(error);

  return {
    success: false,
    error: {
      code: formatted.code,
      message: formatted.message,
      details: formatted.details,
      stack: formatted.stack,
      cause: undefined,
    },
  };
}
