/**
 * Server-only notification senders.
 *
 * These used to be exported from "use server" modules (actions/notifications,
 * actions/push), which made them browser-callable: anyone could write
 * notifications or send pushes to any user. They now live in this plain
 * module, so only server code (server actions, route handlers) can call them
 * after doing its own authorization.
 *
 * Ids: `public.notifications.user_id`, `push_subscriptions.user_id` and the
 * notification preferences are all keyed by the Supabase AUTH id (that is what
 * every reader filters on), while most callers hold PRISMA user ids. For older
 * accounts the two differ, so ids are mapped to the auth id before writing.
 *
 * Deliberately NOT a "use server" module. (The `server-only` package is not
 * installed; never import this from a client component.)
 */
import webpush from "web-push";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";

export interface NotificationInput {
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}

/** Only same-site relative links, never an off-site phishing URL. */
export function safeActionUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : undefined;
}

/**
 * Maps a Prisma user id to the Supabase auth id (same id, else the auth user
 * with the same email). Returns null when no auth account matches.
 */
export async function resolveAuthUserId(prismaUserId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT au.id::text AS id, 0 AS pri FROM auth.users au WHERE au.id::text = ${prismaUserId}
      UNION ALL
      SELECT au.id::text AS id, 1 AS pri
        FROM auth.users au
        JOIN public."User" u ON lower(u.email) = lower(au.email)
       WHERE u.id = ${prismaUserId}
    ) t
    ORDER BY pri
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/** Like resolveAuthUserId, but keeps the given id when nothing matches. */
async function toAuthId(userId: string): Promise<string> {
  try {
    return (await resolveAuthUserId(userId)) ?? userId;
  } catch (err) {
    console.error("[notifications] auth id lookup failed:", err);
    return userId;
  }
}

/** Bulk toAuthId: one query per 1000 ids instead of one per id. */
async function toAuthIds(userIds: string[]): Promise<string[]> {
  const unique = Array.from(new Set(userIds));
  const map = new Map<string, string>();
  try {
    for (let i = 0; i < unique.length; i += 1000) {
      const chunk = unique.slice(i, i + 1000);
      const rows = await prisma.$queryRaw<{ input: string; authId: string | null }[]>`
        SELECT i.id AS "input",
               COALESCE(
                 (SELECT au.id::text FROM auth.users au WHERE au.id::text = i.id LIMIT 1),
                 (SELECT au.id::text
                    FROM auth.users au
                    JOIN public."User" u ON lower(u.email) = lower(au.email)
                   WHERE u.id = i.id
                   LIMIT 1)
               ) AS "authId"
          FROM unnest(${chunk}::text[]) AS i(id)
      `;
      for (const r of rows) if (r.authId) map.set(r.input, r.authId);
    }
  } catch (err) {
    console.error("[notifications] bulk auth id lookup failed:", err);
  }
  return Array.from(new Set(unique.map((id) => map.get(id) ?? id)));
}

// Notification preferences live in Prisma's "NotificationSettings" table,
// keyed by the auth id (written by updateNotificationSettings).
export async function readNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
    select: { preferences: true },
  });
  return (settings?.preferences as Record<string, boolean>) || {};
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
  const prefKey = PUSH_PREF_BY_TYPE[type];
  if (!prefKey) return true;
  try {
    const prefs = preloadedPrefs ?? (await readNotificationPrefs(userId));
    return prefs[prefKey] !== false;
  } catch {
    return true;
  }
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@edyfra.online";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  }
  return false;
}

/**
 * Sends a web push to every subscription of `userId` (an AUTH id, as stored
 * in `push_subscriptions`). Expired subscriptions are pruned.
 */
export async function sendNotificationPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    let webPushSent = 0;
    let webPushExpired = 0;

    const vapidConfigured = getVapidConfig();
    if (vapidConfigured) {
      const adminSupabase = createAdminClient();
      const { data: subscriptions } = await adminSupabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      const data = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: safeActionUrl(payload.url) ?? "/",
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      const expiredEndpoints: string[] = [];

      for (const sub of (subscriptions || [])) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            data
          );
          webPushSent++;
        } catch (err: any) {
          if (
            err.statusCode === 410 ||
            err.statusCode === 404 ||
            err.message?.includes("unsubscribed") ||
            err.message?.includes("expired")
          ) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error("[web-push] send failed:", sub.endpoint, err.message);
          }
        }
      }

      if (expiredEndpoints.length > 0) {
        await adminSupabase
          .from("push_subscriptions")
          .delete()
          .in("endpoint", expiredEndpoints);
        webPushExpired = expiredEndpoints.length;
      }
    }

    return {
      success: true,
      sent: webPushSent,
      expired: webPushExpired,
      errors: 0,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send push notification" };
  }
}

/**
 * Inserts an in-app notification for one user (Prisma or auth id) and sends a
 * push unless the user opted out of that type.
 */
export async function notifyUser(userId: string, data: NotificationInput) {
  const authId = await toAuthId(userId);
  const actionUrl = safeActionUrl(data.actionUrl);
  const adminSupabase = createAdminClient();
  const { data: notification, error } = await adminSupabase
    .from("notifications")
    .insert({
      user_id: authId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: actionUrl,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    if (await shouldSendPush(authId, data.type)) {
      await sendNotificationPush(authId, {
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

/** Bulk variant of notifyUser (Prisma or auth ids). */
export async function notifyManyUsers(userIds: string[], data: NotificationInput) {
  if (userIds.length === 0) return [];

  const authIds = await toAuthIds(userIds);
  const actionUrl = safeActionUrl(data.actionUrl);
  const adminSupabase = createAdminClient();
  await adminSupabase.from("notifications").insert(
    authIds.map((userId) => ({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: actionUrl,
    }))
  );

  let allSettings: { userId: string; preferences: unknown }[] = [];
  try {
    allSettings = await prisma.notificationSettings.findMany({
      where: { userId: { in: authIds } },
      select: { userId: true, preferences: true },
    });
  } catch (err) {
    console.error("[notifyManyUsers] failed to load preferences:", err);
  }

  const prefsMap = new Map(
    allSettings.map(s => [s.userId, (s.preferences as Record<string, boolean>) || {}])
  );

  await Promise.allSettled(
    authIds.map(async (userId) => {
      if (!(await shouldSendPush(userId, data.type, prefsMap.get(userId) ?? {}))) return;
      await sendNotificationPush(userId, {
        title: data.title,
        body: data.body,
        url: actionUrl || "/dashboard/notifications",
      });
    })
  );

  return userIds.length;
}
