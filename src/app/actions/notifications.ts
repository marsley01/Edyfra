"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    return await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    return [];
  }
}

export async function getLatestNotification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    return await prisma.notification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  try {
    return await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
  } catch {
    return 0;
  }
}

export async function getNotificationSettings(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  try {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: user.id },
    });
    return (settings?.preferences as Record<string, boolean>) || {};
  } catch {
    return {};
  }
}

export async function markAllRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/tutor/notifications");
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await prisma.notification.update({
    where: { id, userId: user.id },
    data: { read: true },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/tutor/notifications");
}

const PUSH_PREF_BY_TYPE: Record<string, string> = {
  MATCH_FOUND: "newMatch",
  MATCH_ACCEPTED: "tutorAccepted",
  TUTOR_ACCEPTED: "tutorAccepted",
  NEW_MESSAGE: "newMessage",
  ANNOUNCEMENT: "announcements",
  RESOURCE_APPROVED: "announcements",
  RESOURCE_REJECTED: "announcements",
  DAILY_CHALLENGE: "dailyChallenge",
  POINTS_MILESTONE: "pointsMilestone",
  PAYMENT_SUCCESS: "announcements",
  SESSION_COMPLETE: "newMatch",
  ERROR_ALERT: "announcements",
};

async function shouldSendPush(userId: string, type: string, preloadedPrefs?: Record<string, boolean>): Promise<boolean> {
  try {
    const prefs = preloadedPrefs ?? (() => {
      throw new Error("no prefs");
    })();
    const prefKey = PUSH_PREF_BY_TYPE[type];
    if (!prefKey) return true;
    return prefs[prefKey] !== false;
  } catch {
    // fallback: fetch individually
    try {
      const settings = await prisma.notificationSettings.findUnique({
        where: { userId },
      });
      const prefs = (settings?.preferences as Record<string, boolean>) || {};
      const prefKey = PUSH_PREF_BY_TYPE[type];
      if (!prefKey) return true;
      return prefs[prefKey] !== false;
    } catch {
      return true;
    }
  }
}

export async function notifyUser(
  userId: string,
  data: {
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
  }
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
    },
  });

  try {
    if (await shouldSendPush(userId, data.type)) {
      const { sendNotificationPush } = await import("./push");
      await sendNotificationPush(userId, {
        title: data.title,
        body: data.body,
        url: data.actionUrl || "/dashboard/notifications",
      });
    }
  } catch (err) {
    console.error("[notifyUser] push failed:", err);
  }

  return notification;
}

/** Fan-out in-app + push for bulk announcements and admin alerts. */
export async function notifyManyUsers(
  userIds: string[],
  data: {
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
  }
) {
  if (userIds.length === 0) return [];

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
    })),
  });

  const { sendNotificationPush } = await import("./push");
  // Batch-load notification preferences for all users
  const allSettings = await prisma.notificationSettings.findMany({
    where: { userId: { in: userIds } },
  });
  const prefsMap = new Map(
    allSettings.map(s => [s.userId, s.preferences as Record<string, boolean> || {}])
  );

  await Promise.allSettled(
    userIds.map(async (userId) => {
      if (!(await shouldSendPush(userId, data.type, prefsMap.get(userId)))) return;
      await sendNotificationPush(userId, {
        title: data.title,
        body: data.body,
        url: data.actionUrl || "/dashboard/notifications",
      });
    })
  );

  return userIds.length;
}
