import webpush from "web-push";

const getVapidKeys = () => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    if (typeof window === "undefined") {
      console.warn("VAPID keys not configured. Run: npx tsx scripts/generate-vapid-keys.ts");
    }
    return null;
  }

  webpush.setVapidDetails(
    "mailto:push@edyfra.space",
    publicKey,
    privateKey
  );

  return { publicKey, privateKey };
};

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url?: string; id?: string }
) {
  const keys = getVapidKeys();
  if (!keys) return;

  try {
    await webpush.sendNotification(
      subscription as any,
      JSON.stringify(payload)
    );
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return "expired";
    }
    throw err;
  }
}

export { getVapidKeys };
