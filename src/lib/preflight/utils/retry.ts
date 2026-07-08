import { sleep } from "./time";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryOn?: ((error: Error) => boolean) | undefined;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1_000,
  maxDelay: 30_000,
  jitter: true,
  retryOn: undefined,
};

export class RetryExhaustedError extends Error {
  public override readonly cause: Error;
  public readonly attempts: number;

  constructor(cause: Error, attempts: number) {
    super(`Retry exhausted after ${attempts} attempts: ${cause.message}`);
    this.name = "RetryExhaustedError";
    this.cause = cause;
    this.attempts = attempts;
  }
}

export function calculateBackoff(
  attempt: number,
  options: RetryOptions,
): number {
  const exponential = options.baseDelay * 2 ** attempt;
  const clamped = Math.min(exponential, options.maxDelay);

  if (!options.jitter) {
    return clamped;
  }

  return clamped * (0.5 + Math.random() * 0.5);
}

export function isRetryable(error: Error): boolean {
  if (error instanceof RetryExhaustedError) {
    return false;
  }

  const nonRetryableMessages = [
    "invalid",
    "bad request",
    "not found",
    "unauthorized",
    "forbidden",
    "validation",
  ];

  const message = error.message.toLowerCase();

  const isNonRetryable = nonRetryableMessages.some((msg) =>
    message.includes(msg),
  );

  if (isNonRetryable) {
    return false;
  }

  const statusCodes = [429, 500, 502, 503, 504];
  const statusMatch = /(\d{3})/.exec(message);

  if (statusMatch !== null) {
    const code = Number.parseInt(statusMatch[1] ?? "0", 10);
    return statusCodes.includes(code);
  }

  return true;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      lastError = err;

      if (opts.retryOn !== undefined && !opts.retryOn(err)) {
        throw err;
      }

      if (attempt === opts.maxRetries) {
        throw new RetryExhaustedError(err, attempt + 1);
      }

      if (!isRetryable(err)) {
        throw err;
      }

      const delay = calculateBackoff(attempt, opts);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry failed");
}
