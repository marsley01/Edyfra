import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getCalendarCallbackUrl } from "@/lib/calendar/oauth-config";
import { isDbTimestampExpired } from "@/lib/calendar/db-timestamp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=denied", url.origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=invalid", url.origin));
  }

  const supabase = createAdminClient();

  const { data: oauthState, error: stateError } = await supabase
    .from("CalendarOAuthState")
    .select("*")
    .eq("state", state)
    .single();

  if (stateError) {
    console.error("Calendar OAuth state lookup failed:", stateError.code, stateError.message);
  }

  if (!oauthState) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=expired", url.origin));
  }

  if (isDbTimestampExpired(oauthState.expiresAt)) {
    console.error("Calendar OAuth state expired:", oauthState.id);
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=expired", url.origin));
  }

  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", url.origin));
    }

    const callbackUrl = await getCalendarCallbackUrl();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Calendar token exchange failed:", tokenRes.status, body);
      return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", url.origin));
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in ?? 3600;
    const scope = tokens.scope;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", url.origin));
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get primary calendar ID
    const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/settings/calendar", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let calendarId: string | undefined;
    if (calendarRes.ok) {
      const calendarData = await calendarRes.json();
      calendarId = calendarData.id;
    }

    // Google only returns a refresh token on the first consent. Reconnecting an
    // already-authorized account must not wipe the stored one, otherwise event
    // sync dies as soon as the access token expires.
    const { data: existing } = await supabase
      .from("CalendarConnection")
      .select("refreshToken")
      .eq("userId", oauthState.userId)
      .maybeSingle();

    const storedRefreshToken = refreshToken || existing?.refreshToken || null;

    await supabase
      .from("CalendarConnection")
      .upsert(
        {
          userId: oauthState.userId,
          accessToken,
          refreshToken: storedRefreshToken,
          expiresAt: expiresAt.toISOString(),
          scope: scope ?? null,
          calendarId: calendarId ?? null,
        },
        { onConflict: "userId" },
      );

    await supabase.from("CalendarOAuthState").delete().eq("id", oauthState.id);

    return NextResponse.redirect(new URL("/dashboard/settings?calendar=connected", url.origin));
  } catch (err) {
    console.error("Calendar OAuth callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", url.origin));
  }
}
