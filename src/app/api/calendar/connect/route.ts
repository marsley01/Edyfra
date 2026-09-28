import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login?redirectTo=/api/calendar/connect", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const callbackUrl = process.env.GOOGLE_OAUTH_CALLBACK_URL || "https://edyfra.online/api/calendar/callback";

    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth Client ID is not configured" }, { status: 500 });
    }

    const state = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save state in Supabase for verification
    const { error: stateError } = await supabase
      .from("calendar_oauth_states")
      .insert({
        state,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (stateError) {
      console.error("[Calendar Connect] Failed to save OAuth state:", stateError);
      return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", request.url));
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error("[Calendar Connect] Unexpected error:", error);
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", request.url));
  }
}
