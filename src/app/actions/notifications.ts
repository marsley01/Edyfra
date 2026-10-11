"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { readNotificationPrefs, resolvePrismaUserId } from "@/lib/notifications/server";

// Only the caller's own notifications are read/updated here. The senders
// (notifyUser, notifyManyUsers, sendNotificationPush) live in the non-"use
// server" module @/lib/notifications/server so browsers can't call them.

/** The signed-in user's Prisma id (notifications are keyed by it). */
async function currentPrismaUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (await resolvePrismaUserId(user.id)) ?? null;
}

// Reads the Prisma "Notification" table. These used to query a `notifications`
// table that does not exist, so the bell, list and unread count were always
// empty after 2026-09-25.
export async function getNotifications() {
  const userId = await currentPrismaUserId();
  if (!userId) return [];
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    return [];
  }
}

export async function getLatestNotification() {
  const userId = await currentPrismaUserId();
  if (!userId) return null;
  try {
    return await prisma.notification.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  } catch {
    return null;
  }
}

export async function getUnreadCount() {
  const userId = await currentPrismaUserId();
  if (!userId) return 0;
  try {
    return await prisma.notification.count({ where: { userId, read: false } });
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
  const userId = await currentPrismaUserId();
  if (!userId) return;
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/tutor/notifications");
}

export async function markNotificationRead(id: string) {
  const userId = await currentPrismaUserId();
  if (!userId) return;
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/tutor/notifications");
}
