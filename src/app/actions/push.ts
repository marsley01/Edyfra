"use server";

import prisma from "@/lib/prisma";
import { sendFCMNotification } from "@/lib/notifications/fcm-sender";
import { createClient } from "@/utils/supabase/server";

export async function sendNotificationPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: true, sent: 0 };
    }

    const results = await sendFCMNotification(user.fcmTokens, {
      title: payload.title,
      body: payload.body,
      clickAction: payload.url,
    });

    return { 
      success: results.failure === 0, 
      sent: results.success, 
      expired: 0, 
      errors: results.failure 
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
