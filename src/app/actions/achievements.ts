"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// These actions used to query Supabase tables named `achievements`, `sessions`
// and `daily_challenge_attempts` with snake_case columns. Those tables don't
// exist — Prisma owns `"Achievement"`, `"Session"`, `"DailyChallengeAttempt"`
// with camelCase columns — so every read came back empty and every award
// silently failed (RLS also forbids client inserts). Going through Prisma fixes
// both.

/** Resolve the caller's Prisma id (legacy rows can differ from the auth id). */
async function getMyUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : []),
      ],
    },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

export async function getAchievements() {
  const userId = await getMyUserId();
  if (!userId) throw new Error("Unauthorized");

  return prisma.achievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
  });
}

export async function checkAndAwardAchievements() {
  const userId = await getMyUserId();
  if (!userId) return;

  const [studentSessions, tutorSessions, challengeCount] = await Promise.all([
    prisma.session.count({ where: { studentId: userId, status: "COMPLETED" } }),
    prisma.session.count({ where: { partnerId: userId, status: "COMPLETED" } }),
    prisma.dailyChallengeAttempt.count({ where: { userId } }),
  ]);

  const sessionCount = studentSessions + tutorSessions;

  const possibleAchievements = [
    {
      type: "FIRST_MATCH",
      title: "First Step to Success",
      description: "Completed your first study session.",
      icon: "Zap",
      check: () => sessionCount >= 1
    },
    {
      type: "SESSIONS_5",
      title: "Dedicated Scholar",
      description: "Completed 5 study sessions.",
      icon: "GraduationCap",
      check: () => sessionCount >= 5
    },
    {
      type: "FIRST_CHALLENGE",
      title: "Daily Warrior",
      description: "Completed your first daily quest.",
      icon: "Flame",
      check: () => challengeCount >= 1
    }
  ];

  for (const ach of possibleAchievements) {
    if (ach.check()) {
      await prisma.achievement.upsert({
        where: { userId_type: { userId, type: ach.type } },
        create: {
          userId,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
        },
        update: {},
      });
    }
  }

  revalidatePath("/dashboard/achievements");
}
