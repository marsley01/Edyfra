import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "stats");
  if (!auth.ok) return auth.response;

  try {
    const supabase = createAdminClient();
    const [
      { count: studentCount },
      { count: sessionCount },
      { count: tutorCount },
      { count: resourceCount },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("tutor_profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("status", "approved"),
    ]);

    return NextResponse.json({
      platform: "Edyfra",
      stats: {
        students: studentCount || 0,
        verifiedTutors: tutorCount || 0,
        sessions: sessionCount || 0,
        approvedResources: resourceCount || 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[External Stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
