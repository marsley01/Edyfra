"use server";

import prisma from "@/lib/prisma";
import { getUserData } from "./user";

/**
 * Track an analytics event
 */
export async function trackAnalyticsEvent(
  userId: string,
  eventType: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventType,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Error tracking analytics event:", error);
  }
}

/**
 * Get referral stats for the current user
 */
export async function getReferralStats() {
  try {
    const user = await getUserData();
    if (!user) return { referralCode: null, totalReferrals: 0, bonusEarned: 0 };

    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        referred: { select: { name: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const bonusEarned = referrals.filter(r => r.bonusAwarded).length * 100;

    return {
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      bonusEarned,
      referrals,
    };
  } catch (error) {
    console.error("Error getting referral stats:", error);
    return { referralCode: null, totalReferrals: 0, bonusEarned: 0, referrals: [] };
  }
}

/**
 * Award referral bonus when referred user completes first session
 */
export async function awardReferralBonus(referredUserId: string) {
  try {
    const referred = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { referredBy: true, id: true, points: true },
    });
    if (!referred?.referredBy) return { success: false, error: "No referrer found" };

    // Find the referral record
    const referral = await prisma.referral.findFirst({
      where: { referredId: referredUserId, bonusAwarded: false },
    });
    if (!referral) return { success: false, error: "No pending referral bonus" };

    // Award 100 XP to referrer
    await prisma.user.update({
      where: { id: referred.referredBy },
      data: { points: { increment: 100 } },
    });

    // Award 50 XP to referred user (already given at signup, but give additional)
    await prisma.user.update({
      where: { id: referredUserId },
      data: { points: { increment: 50 } },
    });

    // Mark bonus as awarded
    await prisma.referral.update({
      where: { id: referral.id },
      data: { bonusAwarded: true },
    });

    // Notify referrer
    try {
      const { notifyUser } = await import("./notifications");
      await notifyUser(referred.referredBy, {
        type: "REFERRAL_BONUS",
        title: "🎉 Referral bonus earned!",
        body: `Someone you referred completed their first session. You earned 100 bonus XP!`,
        actionUrl: "/dashboard",
      });
    } catch {}

    // Track analytics
    await trackAnalyticsEvent(referredUserId, "referral", {
      referrerId: referred.referredBy,
      bonusAwarded: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Error awarding referral bonus:", error);
    return { success: false, error: "Internal error" };
  }
}

/**
 * Get analytics for admin dashboard
 */
export async function getAdminAnalytics() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      signupsToday,
      signupsThisWeek,
      signupsThisMonth,
      dau,
      day7Retention,
      day30Retention,
    ] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: "signup", createdAt: { gte: today } } }),
      prisma.analyticsEvent.count({ where: { eventType: "signup", createdAt: { gte: weekAgo } } }),
      prisma.analyticsEvent.count({ where: { eventType: "signup", createdAt: { gte: monthAgo } } }),
      prisma.analyticsEvent.count({ where: { eventType: "signup", createdAt: { gte: today } } }),
      (async () => {
        const sevenDaysAgoUsers = await prisma.analyticsEvent.findMany({
          where: { eventType: "signup", createdAt: { gte: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000), lt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          select: { userId: true },
        });
        const userIds = [...new Set(sevenDaysAgoUsers.map(u => u.userId))];
        if (userIds.length === 0) return { rate: 0, total: 0, returned: 0 };
        const returned = await prisma.analyticsEvent.count({
          where: { userId: { in: userIds }, eventType: "session_complete", createdAt: { gte: today } },
        });
        return { rate: Math.round((returned / userIds.length) * 100), total: userIds.length, returned };
      })(),
      (async () => {
        const thirtyDaysAgoUsers = await prisma.analyticsEvent.findMany({
          where: { eventType: "signup", createdAt: { gte: new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000), lt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          select: { userId: true },
        });
        const userIds = [...new Set(thirtyDaysAgoUsers.map(u => u.userId))];
        if (userIds.length === 0) return { rate: 0, total: 0, returned: 0 };
        const returned = await prisma.analyticsEvent.count({
          where: { userId: { in: userIds }, eventType: "session_complete", createdAt: { gte: today } },
        });
        return { rate: Math.round((returned / userIds.length) * 100), total: userIds.length, returned };
      })(),
    ]);

    return {
      signupsToday,
      signupsThisWeek,
      signupsThisMonth,
      dau,
      day7Retention,
      day30Retention,
    };
  } catch (error) {
    console.error("Error getting admin analytics:", error);
    return {
      signupsToday: 0,
      signupsThisWeek: 0,
      signupsThisMonth: 0,
      dau: 0,
      day7Retention: { rate: 0, total: 0, returned: 0 },
      day30Retention: { rate: 0, total: 0, returned: 0 },
    };
  }
}
