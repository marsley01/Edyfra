export { checkRateLimit, rateLimits } from "./upstash";
export { applyRateLimit } from "./helper";

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent.slice(0, 32)}`;
}

interface RateLimitConfig {
  interval: number;
  maxRequests: number;
}

export function getConfig(pathname: string): RateLimitConfig {
  if (pathname.startsWith("/api/auth")) {
    return { interval: 60_000, maxRequests: 5 };
  }
  if (pathname.startsWith("/api/contact")) {
    return { interval: 60_000, maxRequests: 3 };
  }
  if (pathname.startsWith("/api/newsletter")) {
    return { interval: 60_000, maxRequests: 2 };
  }
  if (pathname.startsWith("/api/ai")) {
    return { interval: 60_000, maxRequests: 10 };
  }
  return { interval: 60_000, maxRequests: 50 };
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ success: boolean; resetAt: number }> {
  const { checkRateLimit } = await import("./upstash");
  const result = await checkRateLimit(key, config.maxRequests, `${config.interval / 1000}s`);
  return {
    success: result.allowed,
    resetAt: result.reset,
  };
}
