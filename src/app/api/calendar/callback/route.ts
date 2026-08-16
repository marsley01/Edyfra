import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=denied", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=invalid", request.url));
  }

  const oauthState = await prisma.calendarOAuthState.findUnique({
    where: { state },
  });

  if (!oauthState || oauthState.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=expired", request.url));
  }

  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const callbackUrl = process.env.GOOGLE_OAUTH_CALLBACK_URL;

    if (!clientId || !clientSecret || !callbackUrl) {
      return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", request.url));
    }

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
      throw new Error("Failed to exchange token");
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;
    const scope = tokens.scope;

    if (!accessToken) {
      throw new Error("No access token received");
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

    await prisma.calendarConnection.upsert({
      where: { userId: oauthState.userId },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
        scope,
        calendarId,
      },
      create: {
        userId: oauthState.userId,
        accessToken,
        refreshToken: refreshToken || "",
        expiresAt,
        scope,
        calendarId,
      },
    });

    await prisma.calendarOAuthState.delete({
      where: { id: oauthState.id },
    });

    return NextResponse.redirect(new URL("/dashboard/settings?calendar=connected", request.url));
  } catch (err) {
    console.error("Calendar OAuth callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/settings?calendar=error", request.url));
  }
}
