import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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

    const [studentCount, sessionCount, tutorCount, resourceCount] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.session.count(),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.resource.count({ where: { status: "approved" } }),
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
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ stats: [] });
  }
}
