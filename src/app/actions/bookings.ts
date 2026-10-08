"use server";

import { getUserData } from "./user";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/app/actions/notifications";
import { getAppUrl } from "@/lib/app-url";
import {
  pythonGetTutorAvailability,
  pythonSaveTutorAvailability,
  pythonGetIncomingRequests,
  pythonGetUpcomingTutorBookings,
  pythonGetUpcomingStudentBookings,
  pythonCreateBooking,
  pythonUpdateBookingStatus,
  pythonGetBookingSessionData,
  pythonConvertBookingToMashAI,
  pythonExpireBookings,
  pythonCreateBookingReminders,
  pythonUpdateBookingMeetingUrl,
} from "@/lib/booking-client";
import { createCalendarEvent } from "@/lib/calendar/google-calendar";
import prisma from "@/lib/prisma";

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

function formatEAT(startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period} EAT`;
}

export async function getTutorAvailability(tutorId?: string) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");
    const targetId = tutorId || user.id;
    const res = await pythonGetTutorAvailability(targetId, user.id);
    return res.availability;
  } catch (error) {
    console.error("Error in getTutorAvailability:", error);
    return [];
  }
}

export async function saveTutorAvailability(tutorId: string, slots: any[]) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");
    const targetId = tutorId || user.id;
    if (user.id !== targetId && user.role !== "ADMIN") throw new Error("Unauthorized");

    await pythonSaveTutorAvailability(targetId, slots, user.id);
    revalidatePath("/tutor/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in saveTutorAvailability:", error);
    throw error;
  }
}

export async function getIncomingBookingRequests() {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");
    const res = await pythonGetIncomingRequests(user.id, user.id);
    return res.requests;
  } catch (error) {
    console.error("Error in getIncomingBookingRequests:", error);
    return [];
  }
}

/** Combine a booking date (YYYY-MM-DD or ISO) and an EAT HH:mm time into an absolute instant. */
function eatDateTime(date: string | Date, time: string): Date {
  const dateKey = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  // EAT is UTC+3 with no DST
  return new Date(Date.UTC(y, m - 1, d, hours - 3, minutes || 0, 0, 0));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export async function updateBookingStatus(bookingId: string, status: string, reason?: string) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    const res = await pythonUpdateBookingStatus(bookingId, status, user.id, reason);
    // The backend returns the raw bookings row (snake_case); accept either shape.
    const raw = res.booking || {};
    const studentId: string = raw.studentId ?? raw.student_id;
    const tutorId: string = raw.tutorId ?? raw.tutor_id;
    const bookingDate: string = raw.date ? String(raw.date).slice(0, 10) : "";
    const startTime: string = raw.startTime ?? raw.start_time ?? "00:00";
    const durationMinutes: number = raw.durationMinutes ?? raw.duration_minutes ?? 60;

    const people = await prisma.user.findMany({
      where: { id: { in: [studentId, tutorId].filter(Boolean) } },
      select: { id: true, name: true, email: true },
    });
    const student = people.find((p) => p.id === studentId);
    const tutor = people.find((p) => p.id === tutorId);
    const booking = {
      id: raw.id ?? bookingId,
      studentId,
      tutorId,
      subject: raw.subject as string,
      topic: (raw.topic ?? null) as string | null,
      date: bookingDate,
      startTime,
      durationMinutes,
      tutorName: tutor?.name,
      tutorEmail: tutor?.email,
      studentName: student?.name,
      studentEmail: student?.email,
    };

    if (!booking.studentId) {
      revalidatePath("/tutor");
      return { success: true };
    }

    if (status === "confirmed") {
      await notifyUser(booking.studentId, {
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed!",
        body: `${booking.tutorName || "Your tutor"} has accepted your ${booking.subject} session on ${formatDay(new Date(booking.date + "T00:00:00Z"))} at ${formatEAT(booking.startTime)}.`,
        actionUrl: `/study-room/${bookingId}`,
      }).catch((e) => console.error("Failed to notify student of confirmation:", e));

      try {
        const sessionDate = eatDateTime(booking.date, booking.startTime);

        const now = new Date();
        const reminder10 = new Date(sessionDate.getTime() - 10 * 60 * 1000);
        const reminder5 = new Date(sessionDate.getTime() - 5 * 60 * 1000);

        const rows: Array<{ userId: string; reminderType: string; scheduledFor: string }> = [];
        if (reminder10 > now && booking.tutorId) {
          rows.push({
            userId: booking.tutorId,
            reminderType: "10min",
            scheduledFor: reminder10.toISOString(),
          });
        }
        if (reminder5 > now) {
          rows.push({
            userId: booking.studentId,
            reminderType: "5min",
            scheduledFor: reminder5.toISOString(),
          });
        }
        if (rows.length > 0) {
          await pythonCreateBookingReminders(bookingId, rows);
        }
      } catch (e) {
        console.error("Failed to schedule booking reminders:", e);
      }

      // Create Google Calendar events for both student and tutor (once each)
      try {
        const startDate = eatDateTime(booking.date, booking.startTime);
        const endDate = new Date(startDate.getTime() + (booking.durationMinutes || 60) * 60 * 1000);

        const eventTitle = `${booking.subject} Session${booking.topic ? `: ${booking.topic}` : ""}`;
        const eventDescription = `Edyfra study session with ${booking.tutorName || "your tutor"}. Join at: ${getAppUrl()}/study-room/${bookingId}`;

        const meetingLinks = [booking.studentId, booking.tutorId].filter(Boolean).map((uid) =>
          createCalendarEvent({
            userId: uid as string,
            summary: eventTitle,
            description: eventDescription,
            start: startDate,
            end: endDate,
            location: `${getAppUrl()}/study-room/${bookingId}`,
            attendees: booking.studentEmail && booking.tutorEmail
              ? [
                  { email: booking.studentEmail, displayName: booking.studentName },
                  { email: booking.tutorEmail, displayName: booking.tutorName },
                ]
              : undefined,
            createMeetingLink: true,
          }).then((res) => res?.meetingLink || res?.hangoutLink || null).catch(() => null),
        );

        const [studentLink, tutorLink] = await Promise.all(meetingLinks);
        const meetLink = studentLink || tutorLink || null;

        if (meetLink) {
          await pythonUpdateBookingMeetingUrl(bookingId, meetLink, user.id).catch((e) => {
            console.error("Failed to save meeting URL:", e);
          });
        }
      } catch (e) {
        console.error("Failed to create calendar events:", e);
      }
    } else if (status === "declined") {
      await notifyUser(booking.studentId, {
        type: "BOOKING_DECLINED",
        title: "Booking Declined",
        body: `${booking.tutorName || "Your tutor"} declined your ${booking.subject} session request.`,
        actionUrl: "/dashboard/tutors",
      }).catch((e) => console.error("Failed to notify student of decline:", e));
    } else if (status === "active") {
      await notifyUser(booking.studentId, {
        type: "SESSION_STARTED",
        title: "Session Started!",
        body: `Your ${booking.subject} session with ${booking.tutorName || "your tutor"} has started. Join now!`,
        actionUrl: `/study-room/${bookingId}`,
      }).catch((e) => console.error("Failed to notify student of start:", e));
    } else if (status === "completed") {
      await notifyUser(booking.studentId, {
        type: "SESSION_COMPLETE",
        title: "Session Completed",
        body: `Great session with ${booking.tutorName || "your tutor"}! Leave a review.`,
        actionUrl: `/dashboard/sessions`,
      }).catch((e) => console.error("Failed to notify student of completion:", e));
      // Note: bookings never increment currentActiveSessions (that counter is
      // for live matches), so completing one must not decrement it either.
    }

    revalidatePath("/tutor");
    revalidatePath("/tutor/requests");
    revalidatePath("/tutor/schedule");
    revalidatePath("/dashboard/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error in updateBookingStatus:", error);
    throw error;
  }
}

export async function getUpcomingBookings() {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");
    const res = await pythonGetUpcomingTutorBookings(user.id, user.id);
    return res.bookings;
  } catch (error) {
    console.error("Error in getUpcomingBookings:", error);
    return [];
  }
}

export async function createBooking(tutorId: string, subject: string, topic: string, date: string, startTime: string, durationMinutes: number) {
  try {
    const user = await getUserData();
    if (!user) return { success: false, error: "Please sign in to book a session" };

    if (tutorId === user.id) return { success: false, error: "You can't book a session with yourself" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return { success: false, error: "Invalid date or time" };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      return { success: false, error: "Invalid session duration" };
    }
    const slotStart = eatDateTime(date, startTime);
    if (Number.isNaN(slotStart.getTime()) || slotStart.getTime() <= Date.now()) {
      return { success: false, error: "That time slot is in the past" };
    }
    const startMin = toMinutes(startTime);
    const endMin = startMin + durationMinutes;
    if (endMin > 24 * 60) return { success: false, error: "Sessions can't run past midnight" };

    const tutor = await prisma.user.findUnique({ where: { id: tutorId }, select: { role: true } });
    if (!tutor || tutor.role !== "TUTOR") return { success: false, error: "Tutor not found" };

    // Prevent double-booking: the tutor (or the student) must not already have
    // a live booking overlapping this slot.
    const sameDay = await prisma.booking.findMany({
      where: {
        date: new Date(date + "T00:00:00Z"),
        status: { in: ["pending", "confirmed", "active"] },
        OR: [{ tutorId }, { studentId: user.id }],
      },
      select: { startTime: true, endTime: true, tutorId: true },
    });
    const clash = sameDay.find((b) => toMinutes(b.startTime) < endMin && toMinutes(b.endTime) > startMin);
    if (clash) {
      return {
        success: false,
        error: clash.tutorId === tutorId
          ? "This tutor is already booked at that time. Please pick another slot."
          : "You already have a session at that time.",
      };
    }

    const res = await pythonCreateBooking(
      { tutorId, subject, topic, date, startTime, durationMinutes },
      user.id,
    );

    try {
      const bookingDate = new Date(date + "T00:00:00Z");
      const dayFormatted = formatDay(bookingDate);
      const timeFormatted = formatEAT(startTime);
      await notifyUser(tutorId, {
        type: "NEW_BOOKING",
        title: "New booking request",
        body: `${user.name} wants a ${subject} session on ${dayFormatted} at ${timeFormatted}`,
        actionUrl: "/tutor",
      });
    } catch (e) {
      console.error("Failed to notify tutor of new booking:", e);
    }

    revalidatePath("/dashboard/sessions");
    revalidatePath("/tutor/requests");
    return { success: true, bookingId: res.bookingId };
  } catch (error) {
    console.error("Error in createBooking:", error);
    const message = error instanceof Error && /blocked|unavailable/i.test(error.message)
      ? "That time slot is no longer available. Please pick another."
      : "Failed to create booking";
    return { success: false, error: message };
  }
}

export async function getUpcomingStudentBookings() {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");
    const res = await pythonGetUpcomingStudentBookings(user.id, user.id);
    return res.bookings;
  } catch (error) {
    console.error("Error in getUpcomingStudentBookings:", error);
    return [];
  }
}

export async function getBookingSessionData(bookingId: string) {
  try {
    const user = await getUserData();
    if (!user) return null;
    const data = await pythonGetBookingSessionData(bookingId);
    // Only the booking's student/tutor (or an admin) may read it
    if (data && data.studentId !== user.id && data.partnerId !== user.id && user.role !== "ADMIN") {
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error fetching booking session:", error);
    return null;
  }
}

export async function convertBookingToMashAI(bookingId: string) {
  try {
    const user = await getUserData();
    if (!user) return { success: false, error: "Unauthorized" };

    const res = await pythonConvertBookingToMashAI(bookingId, user.id);

    return { success: true, sessionId: res.sessionId };
  } catch (error) {
    console.error("Error converting booking to Mash AI:", error);
    return { success: false, error: "Internal error" };
  }
}

export async function expirePendingBookings() {
  try {
    // Exported server actions are publicly callable; restrict to admins
    const user = await getUserData();
    if (!user || user.role !== "ADMIN") return { success: false, error: "Unauthorized" };
    const res = await pythonExpireBookings();
    for (const b of res.expiredBookings) {
      await notifyUser(b.student_id, {
        type: "BOOKING_EXPIRED",
        title: "Booking Expired",
        body: `Your booking with ${b.tutor_name || "a tutor"} has expired because they didn't respond in time.`,
        actionUrl: "/dashboard/tutors",
      });
    }
    return { success: true, expired: res.expired };
  } catch (error) {
    console.error("Error expiring bookings:", error);
    return { success: false, error: "Internal error" };
  }
}
