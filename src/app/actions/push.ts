"use server";

import prisma from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { createClient } from "@/utils/supabase/server";

export async function sendNotificationPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subs.length === 0) return { success: true, sent: 0 };

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { ...payload, id: Date.now().toString() }
        )
      )
    );

    const expiredEndpoints: string[] = [];
    let sentCount = 0;
    let errorCount = 0;

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        errorCount++;
        console.error("[sendNotificationPush] subscription %s rejected:", i, result.reason);
        return;
      }
      const value = result.value;
      if (value === "expired") {
        expiredEndpoints.push(subs[i].endpoint);
      } else if (value === "error") {
        errorCount++;
      } else if (value === "sent") {
        sentCount++;
      }
    });

    if (expiredEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      });
    }

    return { success: errorCount === 0, sent: sentCount, expired: expiredEndpoints.length, errors: errorCount };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send push notification" };
  }
}

export async function getUserPushSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.pushSubscription.findMany({
    where: { userId: user.id },
    select: { endpoint: true, createdAt: true },
  });
}
