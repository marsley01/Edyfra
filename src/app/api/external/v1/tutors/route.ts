import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "tutors");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const supabase = createAdminClient();
    let query = supabase
      .from("tutor_profiles")
      .select(`
        userId:user_id,
        bio,
        hourlyRate:hourly_rate,
        rating,
        totalSessions:total_sessions,
        subjects,
        levelsTaught:levels_taught,
        user:users!user_id ( id, name, avatar )
      `)
      .eq("is_verified", true)
      .order("rating", { ascending: false })
      .limit(limit);

    if (subject) query = query.contains("subjects", [subject]);
    if (level) query = query.contains("levels_taught", [level]);

    const { data: tutors, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      tutors: tutors || [],
      count: tutors?.length || 0,
    });
  } catch (error) {
    console.error("[External Tutors] Error:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
}
