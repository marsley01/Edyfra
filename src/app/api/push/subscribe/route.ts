import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Support both FCM token and Web Push subscription formats
    const fcmToken = body.token;
    const endpoint = body.endpoint;
    const keys = body.keys;

    // Ensure the user exists in Prisma before updating
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, fcmTokens: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 404 });
    }

    // Store FCM token
    if (fcmToken && typeof fcmToken === "string") {
      if (!existingUser.fcmTokens.includes(fcmToken)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { fcmTokens: { push: fcmToken } },
        });
      }
    }

    // Store Web Push subscription (endpoint + p256dh + auth).
    // Senders (src/lib/sendNotification.ts, actions/push.ts) read the
    // Supabase `push_subscriptions` table, so the subscription must be stored
    // there — writing only to the Prisma "PushSubscription" table meant web
    // push was never delivered. Upserting by endpoint also re-binds a shared
    // browser's endpoint to the account that is currently signed in.
    if (endpoint && keys?.p256dh && keys?.auth) {
      const adminSupabase = createAdminClient();
      const { error: upsertError } = await adminSupabase
        .from("push_subscriptions")
        .upsert(
          { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
          { onConflict: "endpoint" }
        );
      if (upsertError) {
        console.error("Push subscribe upsert error:", upsertError);
        return NextResponse.json({ success: false, error: "Could not save subscription" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}
