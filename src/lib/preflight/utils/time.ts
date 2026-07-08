export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(ms: number): string {
  if (ms < 0) {
    return `-${formatDuration(-ms)}`;
  }

  if (ms < 1_000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1_000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const parts = [`${days}d`];
  if (remainingHours > 0) {
    parts.push(`${remainingHours}h`);
  }
  if (remainingMinutes > 0 && remainingHours === 0) {
    parts.push(`${remainingMinutes}m`);
  }
  return parts.join(" ");
}

const DURATION_REGEX = /^(-?\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/;

export function parseDuration(str: string): number | undefined {
  const trimmed = str.trim().toLowerCase();
  const match = DURATION_REGEX.exec(trimmed);

  if (match === null) {
    return undefined;
  }

  const value = Number.parseFloat(match[1] ?? "0");
  const unit = match[2] as string;

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    return undefined;
  }

  return value * multiplier;
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function elapsed(start: number): number {
  return Date.now() - start;
}

export async function timeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export class TimeoutError extends Error {
  public readonly duration: number;

  constructor(duration: number) {
    super(`Operation timed out after ${formatDuration(duration)}`);
    this.name = "TimeoutError";
    this.duration = duration;
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = undefined;
    }, ms);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>): void => {
    const now = Date.now();
    const elapsedSinceLastCall = now - lastCall;

    if (elapsedSinceLastCall >= ms) {
      lastCall = now;
      fn(...args);
      return;
    }

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      lastCall = Date.now();
      fn(...args);
      timer = undefined;
    }, ms - elapsedSinceLastCall);
  };
}

export interface RetryWithBackoffOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryWithBackoffOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1_000,
    maxDelay = 30_000,
    jitter = true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const finalDelay = jitter
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;

      await sleep(finalDelay);
    }
  }

  throw lastError ?? new Error("Retry exhausted");
}
