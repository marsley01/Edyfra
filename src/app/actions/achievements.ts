"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  
  return await prisma.achievement.findMany({
    where: { userId: user.id },
    orderBy: { unlockedAt: 'desc' }
  });
}

export async function checkAndAwardAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      sessionsAsStudent: true,
      sessionsAsTutor: true,
      challenges: true
    }
  });

  if (!userData) return;

  const sessionCount = userData.sessionsAsStudent.length + userData.sessionsAsTutor.length;

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
      check: () => userData.challenges.length >= 1
    }
  ];

  for (const ach of possibleAchievements) {
    if (ach.check()) {
      
      await prisma.achievement.upsert({
        where: {
          userId_type: {
            userId: user.id,
            type: ach.type
          }
        },
        update: {},
        create: {
          userId: user.id,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          icon: ach.icon
        }
      });
    }
  }

  revalidatePath("/dashboard/achievements");
}
