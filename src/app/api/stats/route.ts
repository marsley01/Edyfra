import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { UserRepository } from "@/core/database/repositories/UserRepository";
import { cache, TTL } from "@/lib/cache";

const CACHE_KEY = "api:stats";

export async function GET() {
  try {
    // Serve from cache when available
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
      });
    }

    // Use the anon client — RLS policies on "User", "Session", "TutorProfile",
    // and "resources" are scoped to return only what this public endpoint needs.
    // Service-role must never be used for unauthenticated public routes.
    const supabase = await createClient();
    const userRepo = new UserRepository(supabase);

    const [studentCount, sessionCount, tutorCount, resourceCount] = await Promise.all([
      userRepo.count({ role: "STUDENT" }),
      supabase.from("Session").select("*", { count: "exact", head: true }).then(r => r.count || 0),
      supabase.from("TutorProfile").select("*", { count: "exact", head: true }).eq("isVerified", true).then(r => r.count || 0),
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("status", "approved").then(r => r.count || 0),
    ]);

    const payload = {
      stats: [
        { value: studentCount, label: "Students" },
        { value: tutorCount, label: "Verified Tutors" },
        { value: sessionCount, label: "Sessions" },
        { value: resourceCount, label: "Resources" },
      ],
    };

    cache.set(CACHE_KEY, payload, TTL.GLOBAL_STATS);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("stats GET error:", error);
    return NextResponse.json({ stats: [] });
  }
}
