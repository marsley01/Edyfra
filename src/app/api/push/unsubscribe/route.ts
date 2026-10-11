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
    const token = body.token;
    const endpoint = body.endpoint;

    // Remove FCM token
    if (token && typeof token === "string") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { fcmTokens: true },
      });

      if (dbUser && dbUser.fcmTokens.includes(token)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            fcmTokens: {
              set: dbUser.fcmTokens.filter(t => t !== token),
            },
          },
        });
      }
    }

    // Remove Web Push subscription
    if (endpoint && typeof endpoint === "string") {
      // The endpoint identifies this browser; remove it whoever it is bound to
      // as long as it belongs to this account (Prisma or auth id).
      const prismaId = (await resolvePrismaUserId(user.id)) ?? user.id;
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: { in: [prismaId, user.id] } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
