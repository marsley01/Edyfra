/**
 * Server-only notification helper for Stream (video) events.
 *
 * Stream users are keyed by PRISMA user id, but `public.notifications.user_id`
 * references `auth.users` and every reader (getNotifications, getUnreadCount,
 * markAllRead) filters by the Supabase auth id. For older accounts the two
 * differ, so the Prisma id is mapped back to the auth id (same id, else the
 * auth user with the same email) before inserting.
 *
 * Deliberately NOT a "use server" module. Unlike notifyUser it dedupes per
 * (user, type, actionUrl) so Stream's webhook retries don't duplicate rows.
 */
import prisma from "@/lib/prisma";
import { sendNotificationPush } from "@/lib/notifications/server";

/**
 * Inserts a notification (once per user + type + actionUrl, so Stream's
 * webhook retries don't duplicate it) and sends a push.
 * Returns false when the user doesn't exist or it was already sent.
 */
export async function notifyStreamUser(
  prismaUserId: string,
  data: { type: string; title: string; body: string; actionUrl: string },
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: prismaUserId }, select: { id: true } });
  if (!user) return false;

  const existing = await prisma.notification.findFirst({
    where: { userId: user.id, type: data.type, actionUrl: data.actionUrl },
    select: { id: true },
  });
  if (existing) return false;

  const notification = await prisma.notification.create({
    data: { userId: user.id, type: data.type, title: data.title, body: data.body, actionUrl: data.actionUrl },
  });

  try {
    // Missed calls have no opt-out key in the notification preferences
    await sendNotificationPush(user.id, {
      title: data.title,
      body: data.body,
      url: data.actionUrl,
      id: notification.id,
      type: data.type,
    });
  } catch (err) {
    console.error("[notifyStreamUser] push failed:", err);
  }
  return true;
}
