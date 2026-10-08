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
      // Senders read the Supabase `push_subscriptions` table; also clear any
      // legacy row in the Prisma table.
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
      await prisma.pushSubscription.deleteMany({
        where: { userId: user.id, endpoint },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
