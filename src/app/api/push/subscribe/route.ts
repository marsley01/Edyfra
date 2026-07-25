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

    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Validate input sizes to prevent resource exhaustion
    if (typeof endpoint !== "string" || endpoint.length > 2048) {
      return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }
    if (typeof keys.p256dh !== "string" || keys.p256dh.length > 512) {
      return NextResponse.json({ error: "Invalid p256dh key" }, { status: 400 });
    }
    if (typeof keys.auth !== "string" || keys.auth.length > 512) {
      return NextResponse.json({ error: "Invalid auth key" }, { status: 400 });
    }

    // Ensure the user exists in Prisma before upserting
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      // User is authenticated in Supabase Auth but has no Prisma record yet.
      // Create a minimal one to prevent foreign key violations.
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || "unknown@edyfra.app",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          role: "STUDENT",
          county: "Nairobi",
        },
      });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    // Return 200 even on failure — push subscriptions are best-effort
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
