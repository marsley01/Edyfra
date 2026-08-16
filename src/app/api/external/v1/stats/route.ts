import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "stats");
  if (!auth.ok) return auth.response;

  try {
    const [studentCount, sessionCount, tutorCount, resourceCount] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.session.count(),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.resource.count({ where: { status: "approved" } }),
    ]);

    return NextResponse.json({
      platform: "Edyfra",
      stats: {
        students: studentCount,
        verifiedTutors: tutorCount,
        sessions: sessionCount,
        approvedResources: resourceCount,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[External Stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
