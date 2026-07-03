import webpush, { WebPushError } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

const vapidReady = (() => {
  if (!publicKey || !privateKey) {
    if (typeof window === "undefined") {
      console.warn("VAPID keys not configured. Run: npx tsx scripts/generate-vapid-keys.ts");
    }
    return false;
  }
  try {
    webpush.setVapidDetails("mailto:push@edyfra.space", publicKey, privateKey);
    return true;
  } catch {
    return false;
  }
})();

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url?: string; id?: string }
) {
  if (!vapidReady) return "unconfigured";
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return "invalid";
  }

  try {
    await webpush.sendNotification(
      subscription as unknown as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return "sent";
  } catch (err) {
    const pushErr = err as WebPushError;
    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
      return "expired";
    }
    console.error("[sendPushNotification] delivery error:", pushErr.statusCode, pushErr.message, pushErr.body);
    return "error";
  }
}
