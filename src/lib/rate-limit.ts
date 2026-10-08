import { Redis } from "@upstash/redis";

type RateLimitConfig = {
  interval: number;
  maxRequests: number;
};

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function getConfig(path: string): RateLimitConfig | null {
  // Called by Supabase's servers for every auth email, so all users share one
  // source IP. It is authenticated by its webhook signature instead.
  if (path === "/api/auth/send-email") {
    return null;
  }
  // Fired while the user types on the signup form.
  if (path.startsWith("/api/auth/check-") || path.startsWith("/api/auth/resolve-username")) {
    return { interval: 60_000, maxRequests: 60 };
  }
  if (path.startsWith("/api/auth") || path.startsWith("/api/setup-admin")) {
    return { interval: 60_000, maxRequests: 10 };
  }
  if (path.startsWith("/api/webhooks")) {
    return { interval: 60_000, maxRequests: 60 };
  }
  if (path.startsWith("/api/push")) {
    return { interval: 60_000, maxRequests: 20 };
  }
  if (path.startsWith("/api/contact") || path.startsWith("/api/newsletter")) {
    return { interval: 60_000, maxRequests: 5 };
  }
  return { interval: 60_000, maxRequests: 100 };
}

export async function rateLimit(key: string, config?: RateLimitConfig): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const cfg = config ?? { interval: 60_000, maxRequests: 30 };

  if (redis) {
    const windowSeconds = Math.ceil(cfg.interval / 1000);
    const redisKey = `rl:${key}`;

    // Fixed window: the expiry is set only when the key is created. Re-arming
    // it on every hit (as before) meant a client that kept retrying was never
    // released, because the window slid forward with each blocked request.
    const result = await redis.pipeline()
      .set(redisKey, 0, { nx: true, ex: windowSeconds })
      .incr(redisKey)
      .ttl(redisKey)
      .exec();

    const count = result[1] as number;
    const ttl = Math.max(0, result[2] as number);

    if (count > cfg.maxRequests) {
      return { success: false, remaining: 0, resetAt: Date.now() + (ttl || 0) * 1000 };
    }

    return { success: true, remaining: Math.max(0, cfg.maxRequests - count), resetAt: Date.now() + (ttl || 0) * 1000 };
  }

  return { success: true, remaining: cfg.maxRequests - 1, resetAt: Date.now() + cfg.interval };
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
