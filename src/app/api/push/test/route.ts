import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { notifyUser } from "@/app/actions/notifications";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await notifyUser(user.id, {
      type: "TEST_PUSH",
      title: "Test notification 🔔",
      body: "If you can see this on your phone or desktop, push is working!",
      actionUrl: "/dashboard/notifications",
    });

    return NextResponse.json({ success: true, message: "Test notification sent" });
  } catch (error) {
    console.error("Test push error:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
