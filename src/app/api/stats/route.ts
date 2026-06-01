import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [studentCount, sessionCount, tutorCount, resourceCount] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.session.count(),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.resource.count({ where: { status: "approved" } }),
    ]);

    return NextResponse.json({
      stats: [
        { value: studentCount, label: "Students" },
        { value: tutorCount, label: "Verified Tutors" },
        { value: sessionCount, label: "Sessions" },
        { value: resourceCount, label: "Resources" },
      ],
    });
  } catch (error) {
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ stats: [] });
  }
}
