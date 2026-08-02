import prisma from "@/lib/prisma";

export interface CalendarEventInput {
  userId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: { email: string; displayName?: string }[];
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId: input.userId },
  });

  if (!connection?.accessToken) return null;

  const now = Date.now();
  const expiresAt = connection.expiresAt?.getTime() || 0;
  let accessToken = connection.accessToken;

  // Refresh token if expired
  if (expiresAt < now) {
    if (!connection.refreshToken) return null;

    try {
      const refreshed = await refreshAccessToken(connection.refreshToken);
      if (!refreshed) return null;

      accessToken = refreshed.accessToken;
      await prisma.calendarConnection.update({
        where: { userId: input.userId },
        data: {
          accessToken: refreshed.accessToken,
          expiresAt: new Date(refreshed.expiresAt),
        },
      });
    } catch {
      return null;
    }
  }

  const event = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start.toISOString() },
    end: { dateTime: input.end.toISOString() },
    attendees: input.attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    console.error("Failed to create calendar event:", await res.text());
    return null;
  }

  return await res.json();
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}
