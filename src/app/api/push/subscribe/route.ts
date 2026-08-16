import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

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

    // Store Web Push subscription (endpoint + p256dh + auth)
    if (endpoint && keys?.p256dh && keys?.auth) {
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth },
        create: {
          userId: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}
