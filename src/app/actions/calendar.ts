"use server";

import { createClient } from "@/utils/supabase/server";
import { randomBytes } from "crypto";
import { pythonGetBookingSessionData } from "@/lib/booking-client";
import { generateICSContent, type IcalBookingData } from "@/lib/calendar/ics";

export async function getGoogleCalendarAuthUrl() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Clean up expired states
  await supabase
    .from("calendar_oauth_states")
    .delete()
    .lt("expires_at", new Date().toISOString());

  const state = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await supabase
    .from("calendar_oauth_states")
    .insert({
      state,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_OAUTH_CALLBACK_URL || "https://edyfra.online/api/calendar/callback";
  if (!clientId) return { error: "Google Calendar OAuth is not configured" };

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

export async function disconnectGoogleCalendar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase
    .from("calendar_connections")
    .delete()
    .eq("user_id", user.id);

  return { success: true };
}

export async function getCalendarConnection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("calendar_connections")
    .select("id, provider, calendar_id, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    provider: data.provider || "GOOGLE",
    calendarId: data.calendar_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function generateICalFile(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const booking = await pythonGetBookingSessionData(bookingId);
  if (!booking) return { error: "Booking not found" };

  const isParticipant = booking.studentId === user.id || booking.tutorId === user.id;
  if (!isParticipant && booking.student_id !== user.id && booking.tutor_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const icalData: IcalBookingData = {
    id: booking.id || bookingId,
    subject: booking.subject,
    topic: booking.topic,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationMinutes: booking.durationMinutes,
    tutorName: booking.tutor?.name || booking.tutorName,
    studentName: booking.student?.name || booking.studentName,
    meetingUrl: booking.meetingUrl || `https://edyfra.online/study-room/${bookingId}`,
  };

  const content = generateICSContent(icalData);
  const filename = `edyfra-${icalData.subject}-${bookingId}.ics`;

  return { content, filename, success: true };
}
