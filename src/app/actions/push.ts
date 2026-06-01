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

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { ...payload, id: Date.now().toString() }
        )
      )
    );

    const expiredEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value === "expired") {
        expiredEndpoints.push(subs[i].endpoint);
      }
    });

    if (expiredEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      });
    }

    return { success: true, sent: subs.length };
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
