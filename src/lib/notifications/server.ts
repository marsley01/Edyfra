/**
 * Server-only notification senders.
 *
 * These used to be exported from "use server" modules (actions/notifications,
 * actions/push), which made them browser-callable: anyone could write
 * notifications or send pushes to any user. They now live in this plain
 * module, so only server code (server actions, route handlers) can call them
 * after doing its own authorization.
 *
 * Storage: the Prisma "Notification" and "PushSubscription" tables, keyed by
 * the PRISMA user id (their foreign key). A September rewrite pointed all of
 * this at snake_case tables (`notifications`, `push_subscriptions`) that do not
 * exist, so from 2026-09-25 every in-app notification, every push and every
 * push sign-up failed silently. Notification preferences ("NotificationSettings")
 * are keyed by the Supabase AUTH id. Callers may pass either id.
 *
 * Deliberately NOT a "use server" module. (The `server-only` package is not
 * installed; never import this from a client component.)
 */
import webpush from "web-push";
import { after } from "next/server";
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

/** Prisma user id for a Prisma or auth id (same id, else matched by email). */
export async function resolvePrismaUserId(id: string): Promise<string | null> {
  const direct = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (direct) return direct.id;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM public."User" u
      JOIN auth.users au ON lower(au.email) = lower(u.email)
     WHERE au.id::text = ${id}
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
  // Tutor settings toggles. These keys were saved but had no notification
  // type mapped to them, so switching them off changed nothing.
  MATCH_OFFER: "newRequest",
  NEW_BOOKING: "newRequest",
  STUDENT_JOINED: "studentJoined",
  BOOKING_CANCELLED: "studentLeft",
  SESSION_RATED: "newRating",
  NEW_REVIEW: "newRating",
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

/** Time-critical types expire fast: a "student needs you now" push that
 *  arrives an hour later (phone was offline) is worse than none. */
const URGENT_TYPES = new Set(["MATCH_OFFER", "MATCH_FOUND", "SESSION_STARTED", "MISSED_CALL", "NEW_BOOKING"]);

/**
 * Sends a web push to every subscription of a user (Prisma or auth id).
 * Expired subscriptions are pruned.
 *
 * `id` is the notification id and becomes the notification tag, so the same
 * event shown by the service worker and by an open tab collapses into one.
 */
export async function sendNotificationPush(
  userId: string,
  payload: { title: string; body: string; url?: string; id?: string; type?: string }
) {
  try {
    if (!getVapidConfig()) return { success: true, sent: 0, expired: 0, errors: 0 };

    const prismaId = (await resolvePrismaUserId(userId)) ?? userId;
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: prismaId } });
    if (subscriptions.length === 0) return { success: true, sent: 0, expired: 0, errors: 0 };

    const urgent = !!payload.type && URGENT_TYPES.has(payload.type);
    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: safeActionUrl(payload.url) ?? "/",
      id: payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sentAt: Date.now(),
      ttl: urgent ? 120 : 6 * 3600,
    });
    // Without these, push services default to a 4-week TTL and normal
    // urgency: phones batch the push for later and stale ones arrive hours
    // after the event.
    const options = { TTL: urgent ? 120 : 6 * 3600, urgency: (urgent ? "high" : "normal") as "high" | "normal" };

    const expired: string[] = [];
    let sent = 0;
    let errors = 0;
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data, options);
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.endpoint);
          else {
            errors++;
            console.error("[web-push] send failed:", err.statusCode, err.message);
          }
        }
      }),
    );
    if (expired.length) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } }).catch(() => {});
    }
    return { success: true, sent, expired: expired.length, errors };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send push notification" };
  }
}

/**
 * Inserts an in-app notification for one user (Prisma or auth id) and sends a
 * push unless the user opted out of that type.
 */
/**
 * Runs push delivery after the response is sent when inside a request (so the
 * action that triggered the notification isn't held up by preference lookups
 * and push-service round trips), or immediately when called from a script.
 */
function deliverLater(task: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await task();
      } catch (err) {
        console.error("[notifications] background push failed:", err);
      }
    });
  } catch {
    void task().catch((err) => console.error("[notifications] push failed:", err));
  }
}

export async function notifyUser(userId: string, data: NotificationInput) {
  const prismaId = await resolvePrismaUserId(userId);
  if (!prismaId) throw new Error(`notifyUser: no user for id ${userId}`);
  const actionUrl = safeActionUrl(data.actionUrl);

  const notification = await prisma.notification.create({
    data: { userId: prismaId, type: data.type, title: data.title, body: data.body, actionUrl },
  });

  deliverLater(async () => {
    const authId = await toAuthId(prismaId);
    if (await shouldSendPush(authId, data.type)) {
      await sendNotificationPush(prismaId, {
        title: data.title,
        body: data.body,
        url: actionUrl || "/dashboard/notifications",
        id: notification.id,
        type: data.type,
      });
    }
  });

  return notification;
}

/** Bulk variant of notifyUser (Prisma or auth ids). */
export async function notifyManyUsers(userIds: string[], data: NotificationInput) {
  if (userIds.length === 0) return [];

  const resolved = await Promise.all(Array.from(new Set(userIds)).map((id) => resolvePrismaUserId(id).catch(() => null)));
  const prismaIds = Array.from(new Set(resolved.filter((id): id is string => !!id)));
  if (prismaIds.length === 0) return 0;
  const actionUrl = safeActionUrl(data.actionUrl);

  const created = await prisma.notification.createManyAndReturn({
    data: prismaIds.map((userId) => ({ userId, type: data.type, title: data.title, body: data.body, actionUrl })),
    select: { id: true, userId: true },
  });

  deliverLater(() => pushToMany(created, prismaIds, data, actionUrl));
  return created.length;
}

async function pushToMany(
  created: { id: string; userId: string }[],
  prismaIds: string[],
  data: NotificationInput,
  actionUrl: string | undefined,
) {
  // Preferences are keyed by auth id.
  const authByPrisma = new Map(
    await Promise.all(prismaIds.map(async (id) => [id, await toAuthId(id)] as const)),
  );
  const authIds = Array.from(new Set(authByPrisma.values()));
  let allSettings: { userId: string; preferences: unknown }[] = [];
  try {
    allSettings = await prisma.notificationSettings.findMany({
      where: { userId: { in: [...authIds, ...prismaIds] } },
      select: { userId: true, preferences: true },
    });
  } catch (err) {
    console.error("[notifyManyUsers] failed to load preferences:", err);
  }
  const prefsMap = new Map(allSettings.map((s) => [s.userId, (s.preferences as Record<string, boolean>) || {}]));

  await Promise.allSettled(
    created.map(async (n) => {
      const prefs = prefsMap.get(authByPrisma.get(n.userId) ?? n.userId) ?? prefsMap.get(n.userId) ?? {};
      if (!(await shouldSendPush(n.userId, data.type, prefs))) return;
      await sendNotificationPush(n.userId, {
        title: data.title,
        body: data.body,
        url: actionUrl || "/dashboard/notifications",
        id: n.id,
        type: data.type,
      });
    }),
  );
}
