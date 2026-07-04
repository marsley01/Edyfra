import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getVapidDetails() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO || "mailto:edyfraplatform@gmail.com";

  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured");
    return null;
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  return { publicKey, privateKey };
}

export async function sendNotificationToUser(
  userId: string,
  data: {
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
  }
) {
  if (!serviceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not configured");
    return { success: false };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const vapid = getVapidDetails();
  if (!vapid) return { success: false };

  const notificationPayload = {
    title: data.title,
    body: data.body,
    url: data.actionUrl || "/dashboard/notifications",
    type: data.type,
    id: `${Date.now()}-${userId}`,
  };

  try {
    const { data: subscriptions, error: subError } = await adminClient
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subError) throw subError;

    const expiredEndpoints: string[] = [];

    await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            } as webpush.PushSubscription,
            JSON.stringify(notificationPayload)
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    if (expiredEndpoints.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const { error: notifError } = await adminClient.from("notifications").insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: data.actionUrl || "/dashboard/notifications",
      read: false,
    });

    if (notifError) throw notifError;

    return { success: true };
  } catch (error) {
    console.error("[sendNotificationToUser] Error:", error);
    return { success: false, error };
  }
}