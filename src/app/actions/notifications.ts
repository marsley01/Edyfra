"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

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
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    return (settings?.preferences as Record<string, boolean>) || {};
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
      const adminSupabase = createAdminClient();
      const { data: settings } = await adminSupabase
        .from("notification_settings")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();

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
  const adminSupabase = createAdminClient();
  const { data: notification, error } = await adminSupabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: data.actionUrl,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    const { data: settings } = await adminSupabase
      .from("notification_settings")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();

    const prefs = (settings?.preferences as Record<string, boolean>) || {};
    if (await shouldSendPush(userId, data.type, prefs)) {
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

  const adminSupabase = createAdminClient();
  await adminSupabase.from("notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: data.actionUrl,
    }))
  );

  const { sendNotificationPush } = await import("./push");
  const { data: allSettings } = await adminSupabase
    .from("notification_settings")
    .select("user_id, preferences")
    .in("user_id", userIds);

  const prefsMap = new Map(
    (allSettings || []).map(s => [s.user_id, (s.preferences as Record<string, boolean>) || {}])
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
