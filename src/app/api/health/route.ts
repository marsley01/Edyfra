import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("plans").select("id").limit(1);
    checks.database = error ? "error" : "ok";
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
