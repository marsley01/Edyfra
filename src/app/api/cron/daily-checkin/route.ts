// ============================================
// MASH DAILY CHECK-IN CRON
// Runs every day at 7am EAT
// Sends push notification to students
// ============================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyManyUsers } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, studentProfile: { select: { subjects: true } } },
    });

    let sent = 0;
    for (const student of students) {
      if (!student.studentProfile?.subjects?.length) continue;
      const subject = student.studentProfile.subjects[0];
      try {
        await notifyManyUsers([student.id], {
          type: "DAILY_CHALLENGE",
          title: `Good morning ${student.name} ☀️`,
          body: `Mash has a quick 5-question ${subject} warm-up for you. Takes 3 minutes.`,
          actionUrl: "/dashboard",
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send check-in to ${student.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, sent, total: students.length });
  } catch (error) {
    console.error("Daily check-in error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
