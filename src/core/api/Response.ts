import { NextResponse } from "next/server";
import { AppError } from "@/core/errors";
import { logger } from "@/core/logging";
import type { PaginatedResult } from "@/core/database";

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function paginated<T>(result: PaginatedResult<T>): NextResponse {
  return NextResponse.json(result);
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(err.toResponse(), { status: err.status });
  }

  logger.error("Unhandled API error", {
    error: err instanceof Error ? err.message : String(err),
  });

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export function validationError(message: string, details?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message, details } },
    { status: 400 },
  );
}
