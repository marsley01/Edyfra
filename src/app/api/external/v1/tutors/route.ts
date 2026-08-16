import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "tutors");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const where: any = { isVerified: true };

    if (subject) where.subjects = { has: subject };
    if (level) where.levelsTaught = { has: level };

    const tutors = await prisma.tutorProfile.findMany({
      where,
      take: limit,
      orderBy: { rating: "desc" },
      select: {
        userId: true,
        bio: true,
        hourlyRate: true,
        rating: true,
        totalSessions: true,
        subjects: true,
        levelsTaught: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({
      tutors,
      count: tutors.length,
    });
  } catch (error) {
    console.error("[External Tutors] Error:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
}
