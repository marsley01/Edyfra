import { createClient } from "@/utils/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type Feature = 
  | "mash_ai" 
  | "tutor_access" 
  | "session_history" 
  | "daily_challenges" 
  | "themes";

export async function checkFeatureAccess(feature: Feature) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { allowed: false, reason: "UNAUTHORIZED" };

  // Fetch user plan and current usage
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      dailyMessageCount: true,
      lastCountReset: true,
    }
  });

  if (!dbUser) return { allowed: false, reason: "USER_NOT_FOUND" };

  // Plus users have full access to everything
  if (dbUser.plan === "plus") {
    return { allowed: true };
  }

  // Free users limits
  switch (feature) {
    case "mash_ai":
      // Check if message count needs reset (daily)
      const now = new Date();
      const lastReset = dbUser.lastCountReset || new Date(0);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      let currentCount = dbUser.dailyMessageCount;
      if (isNewDay) {
        currentCount = 0;
        await prisma.user.update({
          where: { id: user.id },
          data: { dailyMessageCount: 0, lastCountReset: now }
        });
      }

      if (currentCount >= 10) {
        return { allowed: false, reason: "LIMIT_REACHED", limit: 10 };
      }
      return { allowed: true };

    case "tutor_access":
      return { allowed: false, reason: "PLUS_ONLY" };

    case "daily_challenges":
      const challengeCompletions = await prisma.challengeCompletion.count({
        where: {
          userId: user.id,
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });
      if (challengeCompletions >= 1) {
        return { allowed: false, reason: "LIMIT_REACHED", limit: 1 };
      }
      return { allowed: true };

    case "session_history":
      // This is handled in the query level, but we can return limit info
      return { allowed: true, limit: 3 };

    default:
      return { allowed: true };
  }
}

export async function incrementDailyAICount(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyMessageCount: { increment: 1 },
      lastCountReset: new Date()
    }
  });
}
