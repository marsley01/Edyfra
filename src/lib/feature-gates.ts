import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

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

  // Fetch user plan, current usage, and credits
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      dailyMessageCount: true,
      lastCountReset: true,
      userCredits: {
        select: {
          balance: true
        }
      }
    }
  });

  if (!dbUser) return { allowed: false, reason: "USER_NOT_FOUND" };

  // Plus users have full access to everything
  if (dbUser.plan === "plus") {
    return { allowed: true };
  }

  // Free users - check limits or allow spending credits
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

      // If under daily limit, allow access
      if (currentCount < 10) {
        return { allowed: true };
      }
      
      // If at limit, check if user has credits to spend
      const creditBalance = dbUser.userCredits?.balance || 0;
      if (creditBalance >= 1) { // 1 credit for extra Mash AI chat
        return { 
          allowed: true, 
          requiresCredit: true, 
          creditAmount: 1,
          reason: "CREDIT_OPTION"
        };
      }
      
      return { allowed: false, reason: "LIMIT_REACHED", limit: 10 };

    case "tutor_access":
      // Check if user has credits for tutor access
      const tutorCreditBalance = dbUser.userCredits?.balance || 0;
      if (tutorCreditBalance >= 5) { // 5 credits for tutor session
        return { 
          allowed: true, 
          requiresCredit: true, 
          creditAmount: 5,
          reason: "CREDIT_OPTION"
        };
      }
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
      
      // If under daily limit, allow access
      if (challengeCompletions < 1) {
        return { allowed: true };
      }
      
      // If at limit, check if user has credits to spend
      const challengeCreditBalance = dbUser.userCredits?.balance || 0;
      if (challengeCreditBalance >= 1) { // 1 credit for extra challenge
        return { 
          allowed: true, 
          requiresCredit: true, 
          creditAmount: 1,
          reason: "CREDIT_OPTION"
        };
      }
      
      return { allowed: false, reason: "LIMIT_REACHED", limit: 1 };

    case "session_history":
      // This is handled in the query level, but we can return limit info
      // For now, we'll allow access but limit to 3 sessions in the query
      return { allowed: true };

    case "themes":
      // Check if user has credits for premium themes
      const themesCreditBalance = dbUser.userCredits?.balance || 0;
      if (themesCreditBalance >= 3) { // 3 credits for premium themes access
        return { 
          allowed: true, 
          requiresCredit: true, 
          creditAmount: 3,
          reason: "CREDIT_OPTION"
        };
      }
      return { allowed: false, reason: "PLUS_ONLY" };

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

export async function spendCredits(userId: string, amount: number, type: string, description?: string) {
  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // Deduct credits
    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount
        }
      }
    });
    
    // Record transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount, // Negative for debit
        type,
        description,
      }
    });
  });
}

export async function addCredits(userId: string, amount: number, type: string, description?: string, reference?: string) {
  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // Add credits
    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: {
          increment: amount
        }
      }
    });
    
    // Record transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount, // Positive for credit
        type,
        description,
        reference,
      }
    });
  });
}
