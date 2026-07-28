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

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid FCM token" }, { status: 400 });
    }

    // Ensure the user exists in Prisma before updating
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, fcmTokens: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 404 });
    }

    // Add token if not already in the array
    if (!existingUser.fcmTokens.includes(token)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fcmTokens: {
            push: token,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    // Return 200 even on failure — push subscriptions are best-effort
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}
