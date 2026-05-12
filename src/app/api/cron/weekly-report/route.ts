import { NextResponse } from "next/server";
import { AIService } from "@/utils/ai-service";
import prisma from "@/lib/prisma";

export const maxDuration = 60; // Allow 60 seconds

export async function GET(request: Request) {
  // Simple auth check for Cron jobs to prevent public triggering
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized Cron Attempt", { authHeader });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all active students
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true }
    });

    let reportsGenerated = 0;

    for (const student of students) {
      // Get last week's sessions
      const sessions = await prisma.session.findMany({
        where: {
          studentId: student.id,
          endedAt: { gte: oneWeekAgo },
          status: "COMPLETED"
        },
        include: { review: true }
      });

      // Get last week's challenges
      const challenges = await prisma.dailyChallengeAttempt.findMany({
        where: {
          userId: student.id,
          createdAt: { gte: oneWeekAgo }
        }
      });

      if (sessions.length === 0 && challenges.length === 0) {
        continue; // No activity to report on
      }

      const totalPoints = challenges.reduce((acc, curr) => acc + curr.pointsEarned, 0);
      const correctChallenges = challenges.filter(c => c.correct).length;

      const prompt = `
        You are an expert tutor. Generate a very brief weekly progress report for ${student.name}.
        Activity this week:
        - Completed ${sessions.length} study sessions.
        - Attempted ${challenges.length} challenges, got ${correctChallenges} correct.
        - Earned ${totalPoints} points from challenges.

        Provide a 2-3 sentence encouraging insight highlighting their effort and giving a general tip for next week.
      `;

      try {
        const insight = await AIService.generateCompletion(prompt);

        await prisma.notification.create({
          data: {
            userId: student.id,
            type: "WEEKLY_REPORT",
            title: "Your Weekly Progress Report is Here!",
            body: insight,
            actionUrl: `/dashboard/profile`
          }
        });
        
        reportsGenerated++;
      } catch (err) {
        console.error(`Failed to generate report for ${student.id}`, err);
      }
    }

    return NextResponse.json({ success: true, count: reportsGenerated });
  } catch (error: any) {
    console.error("Weekly Report Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
