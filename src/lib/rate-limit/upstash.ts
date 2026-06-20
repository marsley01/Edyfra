import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimits = {
  login: {
    prefix: "edyfra:login",
    limit: 5,
    window: "15m",
  },
  signup: {
    prefix: "edyfra:signup",
    limit: 3,
    window: "1h",
  },
  passwordReset: {
    prefix: "edyfra:reset",
    limit: 3,
    window: "1h",
  },
  aiChat: {
    prefix: "edyfra:ai",
    limit: 100,
    window: "1h",
  },
  api: {
    prefix: "edyfra:api",
    limit: 200,
    window: "1m",
  },
  upload: {
    prefix: "edyfra:upload",
    limit: 10,
    window: "1h",
  },
  booking: {
    prefix: "edyfra:booking",
    limit: 20,
    window: "24h",
  },
};

export async function checkRateLimit(
  limitKey: string,
  limit: number,
  window: string,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `rl:${limitKey}`;

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, parseWindowToSeconds(window));
  const results = await pipeline.exec() as unknown[];

  let countNum = 0;
  let ttlNum = 0;

  const countResult = results[0];
  const ttlResult = results[1];

  if (Array.isArray(countResult) && countResult.length > 1) {
    const val = countResult[1];
    if (typeof val === "number") countNum = val;
  }

  if (Array.isArray(ttlResult) && ttlResult.length > 1) {
    const val = ttlResult[1];
    if (typeof val === "number") ttlNum = val;
  }

  const resetAt = Date.now() + ttlNum * 1000;

  return {
    allowed: countNum <= limit,
    remaining: Math.max(0, limit - countNum),
    reset: resetAt,
  };
}

function parseWindowToSeconds(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) return 60;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      return 60;
  }
}
