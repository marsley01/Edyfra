"use server";

import prisma from "@/lib/prisma";
import { sendFCMNotification } from "@/lib/notifications/fcm-sender";
import { createClient } from "@/utils/supabase/server";
import webpush from "web-push";

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@edyfra.com";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  }
  return false;
}

export async function sendNotificationPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    let fcmSuccess = 0;
    let fcmFailure = 0;

    // Send via FCM
    if (user?.fcmTokens && user.fcmTokens.length > 0) {
      const fcmResult = await sendFCMNotification(user.fcmTokens, {
        title: payload.title,
        body: payload.body,
        clickAction: payload.url,
      });
      fcmSuccess = fcmResult.success;
      fcmFailure = fcmResult.failure;
    }

    // Send via Web Push API (service worker push notifications)
    let webPushSent = 0;
    let webPushExpired = 0;

    const vapidConfigured = getVapidConfig();
    if (vapidConfigured) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });

      const data = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/",
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      const expiredEndpoints: string[] = [];

      for (const sub of subscriptions) {
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
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: { in: expiredEndpoints } },
        });
        webPushExpired = expiredEndpoints.length;
      }
    }

    const totalSent = fcmSuccess + webPushSent;
    const totalFailed = fcmFailure;

    return {
      success: totalFailed === 0,
      sent: totalSent,
      expired: webPushExpired,
      errors: totalFailed,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send push notification" };
  }
}

export async function getUserPushSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fcmTokens: true },
  });

  return dbUser?.fcmTokens || [];
}
