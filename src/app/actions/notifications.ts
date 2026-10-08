"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

// Notification preferences live in Prisma's "NotificationSettings" table
// (written by updateNotificationSettings). There is no `notification_settings`
// Supabase table, so the old `.from("notification_settings")` reads always
// failed: the settings page never showed saved toggles and push opt-outs were
// ignored.
async function readNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
    select: { preferences: true },
  });
  return (settings?.preferences as Record<string, boolean>) || {};
}

/**
 * These functions are exported from a "use server" module, so they are
 * reachable from the browser. Only allow same-site relative links so a crafted
 * call can't plant an off-site phishing URL in someone's notifications.
 */
function safeActionUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : undefined;
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return (notifications || []).map(n => ({
      ...n,
      createdAt: n.created_at,
      userId: n.user_id,
      actionUrl: n.action_url,
    }));
  } catch {
    return [];
  }
}

export async function getLatestNotification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: notification } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!notification) return null;
    return {
      ...notification,
      createdAt: notification.created_at,
      userId: notification.user_id,
      actionUrl: notification.action_url,
    };
  } catch {
    return null;
  }
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  try {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    return count || 0;
  } catch {
    return 0;
  }
}

export async function getNotificationSettings(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  try {
    return await readNotificationPrefs(user.id);
  } catch {
    return {};
  }
}

export async function markAllRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/tutor/notifications");
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);

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
  FORUM_REPLY: "announcements",
  FORUM_MENTION: "announcements",
  FORUM_PICK: "announcements",
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
    try {
      const prefs = await readNotificationPrefs(userId);
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
  const actionUrl = safeActionUrl(data.actionUrl);
  const adminSupabase = createAdminClient();
  const { data: notification, error } = await adminSupabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: actionUrl,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    const prefs = await readNotificationPrefs(userId);
    if (await shouldSendPush(userId, data.type, prefs)) {
      const { sendNotificationPush } = await import("./push");
      await sendNotificationPush(userId, {
        title: data.title,
        body: data.body,
        url: actionUrl || "/dashboard/notifications",
      });
    }
  } catch (err) {
    console.error("[notifyUser] push failed:", err);
  }

  return notification;
}

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

  const actionUrl = safeActionUrl(data.actionUrl);
  const adminSupabase = createAdminClient();
  await adminSupabase.from("notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: actionUrl,
    }))
  );

  const { sendNotificationPush } = await import("./push");
  let allSettings: { userId: string; preferences: unknown }[] = [];
  try {
    allSettings = await prisma.notificationSettings.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, preferences: true },
    });
  } catch (err) {
    console.error("[notifyManyUsers] failed to load preferences:", err);
  }

  const prefsMap = new Map(
    allSettings.map(s => [s.userId, (s.preferences as Record<string, boolean>) || {}])
  );

  await Promise.allSettled(
    userIds.map(async (userId) => {
      if (!(await shouldSendPush(userId, data.type, prefsMap.get(userId)))) return;
      await sendNotificationPush(userId, {
        title: data.title,
        body: data.body,
        url: actionUrl || "/dashboard/notifications",
      });
    })
  );

  return userIds.length;
}
