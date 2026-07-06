import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const responseTime = Date.now() - startTime;
  const allHealthy = checks.database === "ok";

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
