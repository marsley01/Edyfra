"use server";

import { createClient } from "@/utils/supabase/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { pythonGetBookingSessionData } from "@/lib/booking-client";
import { generateICSContent, type IcalBookingData } from "@/lib/calendar/ics";

export async function getGoogleCalendarAuthUrl() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Clean up expired states
  await prisma.calendarOAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const state = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.calendarOAuthState.create({
    data: {
      state,
      userId: user.id,
      expiresAt,
    },
  });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_OAUTH_CALLBACK_URL;
  if (!clientId || !callbackUrl) return { error: "Google Calendar OAuth is not configured" };

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

  await prisma.calendarConnection.deleteMany({
    where: { userId: user.id },
  });

  return { success: true };
}

export async function getCalendarConnection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.calendarConnection.findUnique({
    where: { userId: user.id },
    select: { id: true, provider: true, calendarId: true, createdAt: true, updatedAt: true },
  });
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
    meetingUrl: booking.meetingUrl || `https://edyfra-v2.vercel.app/study-room/${bookingId}`,
  };

  const content = generateICSContent(icalData);
  const filename = `edyfra-${icalData.subject}-${bookingId}.ics`;

  return { content, filename, success: true };
}
