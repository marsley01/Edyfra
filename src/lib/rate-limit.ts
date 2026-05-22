type RateLimitConfig = {
  interval: number;
  maxRequests: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, RateLimitEntry>();

function getConfig(path: string): RateLimitConfig {
  if (path.startsWith("/api/auth") || path.startsWith("/api/setup-admin")) {
    return { interval: 60_000, maxRequests: 10 };
  }
  if (path.startsWith("/api/webhooks")) {
    return { interval: 60_000, maxRequests: 60 };
  }
  if (path.startsWith("/api/push")) {
    return { interval: 60_000, maxRequests: 20 };
  }
  return { interval: 60_000, maxRequests: 100 };
}

export async function rateLimit(key: string, config?: RateLimitConfig): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const cfg = config ?? { interval: 60_000, maxRequests: 30 };
  const now = Date.now();

  let entry = stores.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + cfg.interval };
    stores.set(key, entry);
    return { success: true, remaining: cfg.maxRequests - 1, resetAt: entry.resetAt };
  }

  entry.count++;

  if (entry.count > cfg.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { success: true, remaining: cfg.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "127.0.0.1";
  const url = new URL(request.url);
  return `api:${ip}:${url.pathname}`;
}

export { getConfig };

export async function withRateLimit<T>(
  actionName: string,
  userId: string | null | undefined,
  fn: () => Promise<T>,
  config?: RateLimitConfig,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const cfg = config ?? { interval: 60_000, maxRequests: 30 };
  const key = userId ? `action:${userId}:${actionName}` : `action:anon:${actionName}`;
  const result = await rateLimit(key, cfg);

  if (!result.success) {
    return { success: false, error: "Too many requests. Please slow down and try again." };
  }

  const data = await fn();
  return { success: true, data };
}
