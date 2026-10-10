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
import { resolveAuthUserId, sendNotificationPush } from "@/lib/notifications/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Inserts a notification (once per user + type + actionUrl, so Stream's
 * webhook retries don't duplicate it) and sends a push.
 * Returns false when the user has no auth account or it was already sent.
 */
export async function notifyStreamUser(
  prismaUserId: string,
  data: { type: string; title: string; body: string; actionUrl: string },
): Promise<boolean> {
  const authId = await resolveAuthUserId(prismaUserId);
  if (!authId) return false;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", authId)
    .eq("type", data.type)
    .eq("action_url", data.actionUrl)
    .limit(1);
  if (existing && existing.length > 0) return false;

  const { error } = await admin.from("notifications").insert({
    user_id: authId,
    type: data.type,
    title: data.title,
    body: data.body,
    action_url: data.actionUrl,
  });
  if (error) throw error;

  try {
    // Missed calls have no opt-out key in the notification preferences
    await sendNotificationPush(authId, { title: data.title, body: data.body, url: data.actionUrl });
  } catch (err) {
    console.error("[notifyStreamUser] push failed:", err);
  }
  return true;
}
