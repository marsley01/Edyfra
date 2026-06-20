import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./upstash";

export async function applyRateLimit(
  req: NextRequest,
  limitKey: string,
  limit: number,
  window: string,
  identifier?: string,
): Promise<NextResponse | null> {
  const ip =
    (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous") as string;
  const key = identifier || ip;

  const result = await checkRateLimit(key, limit, window);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.reset.toString(),
        },
      },
    );
  }

  return null;
}
