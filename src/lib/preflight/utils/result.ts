import type { Result as ResultType, ErrorDetail } from "@agent-preflight/types";

export type { ResultType, ErrorDetail };

export function ok<T>(value: T): ResultType<T> {
  return { success: true, value };
}

export function err<E = ErrorDetail>(error: E): ResultType<never, E> {
  return { success: false, error: error as E };
}

export function tryCatch<T>(
  fn: () => T,
): ResultType<T> {
  try {
    return ok(fn());
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    return err({
      code: "INTERNAL_ERROR",
      message: typedError.message,
      details: typedError,
      stack: typedError.stack,
      cause: undefined,
    });
  }
}

export async function promiseToResult<T>(
  promise: Promise<T>,
): Promise<ResultType<T>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    return err({
      code: "INTERNAL_ERROR",
      message: typedError.message,
      details: typedError,
      stack: typedError.stack,
      cause: undefined,
    });
  }
}

export function isOk<T, E>(result: ResultType<T, E>): result is { success: true; value: T } {
  return result.success;
}

export function isErr<T, E>(result: ResultType<T, E>): result is { success: false; error: E } {
  return !result.success;
}

export function unwrap<T, E>(result: ResultType<T, E>): T {
  if (!result.success) {
    throw new Error(
      `Called unwrap on an error result: ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}

export function unwrapOr<T, E>(result: ResultType<T, E>, defaultValue: T): T {
  if (!result.success) {
    return defaultValue;
  }

  return result.value;
}

export function map<T, E, U>(
  result: ResultType<T, E>,
  fn: (value: T) => U,
): ResultType<U, E> {
  if (!result.success) {
    return result as unknown as ResultType<U, E>;
  }

  return ok(fn(result.value)) as ResultType<U, E>;
}

export function flatMap<T, E, U, E2>(
  result: ResultType<T, E>,
  fn: (value: T) => ResultType<U, E2>,
): ResultType<U, E | E2> {
  if (!result.success) {
    return result as unknown as ResultType<U, E | E2>;
  }

  return fn(result.value);
}
