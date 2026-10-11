import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { resolvePrismaUserId } from "@/lib/notifications/server";

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

    // Older accounts can have a Prisma id that differs from the auth id.
    const prismaId = await resolvePrismaUserId(user.id);
    if (!prismaId) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 404 });
    }

    // Store FCM token
    if (fcmToken && typeof fcmToken === "string") {
      const existingUser = await prisma.user.findUnique({ where: { id: prismaId }, select: { fcmTokens: true } });
      if (existingUser && !existingUser.fcmTokens.includes(fcmToken)) {
        await prisma.user.update({ where: { id: prismaId }, data: { fcmTokens: { push: fcmToken } } });
      }
    }

    // Store the Web Push subscription in the Prisma "PushSubscription" table,
    // which is what the sender reads. It used to go to a `push_subscriptions`
    // table that does not exist, so every sign-up failed (the "Push subscribe
    // upsert error" in the logs) and no push could ever be delivered.
    // Upserting by endpoint re-binds a shared browser to whoever is signed in.
    if (endpoint && keys?.p256dh && keys?.auth) {
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: prismaId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId: prismaId, p256dh: keys.p256dh, auth: keys.auth },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}
