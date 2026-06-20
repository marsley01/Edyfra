import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, string> = {};

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);
    checks.database = error ? "error" : "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    checks.ai = res.ok ? "ok" : "error";
  } catch {
    checks.ai = "error";
  }

  checks.stream = process.env.NEXT_PUBLIC_STREAM_KEY ? "configured" : "missing";

  const responseTime = Date.now() - startTime;
  const allHealthy = Object.values(checks).every((v) => v === "ok" || v === "configured");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      services: checks,
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
