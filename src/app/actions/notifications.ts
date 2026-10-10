"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { readNotificationPrefs } from "@/lib/notifications/server";

// Only the caller's own notifications are read/updated here. The senders
// (notifyUser, notifyManyUsers, sendNotificationPush) live in the non-"use
// server" module @/lib/notifications/server so browsers can't call them.

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
