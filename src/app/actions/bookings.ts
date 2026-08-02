"use server";

import { getUserData } from "./user";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/app/actions/notifications";
import { decrementTutorActiveSessions } from "./match-algorithm";
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
} from "@/lib/booking-client";
import { createCalendarEvent } from "@/lib/calendar/google-calendar";

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

export async function updateBookingStatus(bookingId: string, status: string, reason?: string) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    const res = await pythonUpdateBookingStatus(bookingId, status, user.id, reason);
    const booking = res.booking;

    if (status === "confirmed") {
      await notifyUser(booking.studentId, {
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed!",
        body: `${booking.tutorName || "Your tutor"} has accepted your ${booking.subject} session on ${formatDay(new Date(booking.date))} at ${formatEAT(booking.startTime)}.`,
        actionUrl: `/study-room/${bookingId}`,
      });

      try {
        const sessionDate = new Date(booking.date + "T00:00:00Z");
        const [hours, minutes] = booking.startTime.split(":").map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const reminder10 = new Date(sessionDate.getTime() - 10 * 60 * 1000);
        const reminder5 = new Date(sessionDate.getTime() - 5 * 60 * 1000);

        const rows: Array<{ userId: string; reminderType: string; scheduledFor: string }> = [];
        if (reminder10 > now) {
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

        // Create Google Calendar events for both student and tutor
        try {
          const startDate = new Date(sessionDate);
          const endDate = new Date(startDate.getTime() + (booking.durationMinutes || 60) * 60 * 1000);

          const eventTitle = `${booking.subject} Session${booking.topic ? `: ${booking.topic}` : ""}`;
          const eventDescription = `Edyfra study session with ${booking.tutorName || "your tutor"}. Join at: /study-room/${bookingId}`;

          await Promise.all([
            createCalendarEvent({
              userId: booking.studentId,
              summary: eventTitle,
              description: eventDescription,
              start: startDate,
              end: endDate,
              location: "https://edyfra-v2.vercel.app/study-room/" + bookingId,
            }),
            booking.tutorId
              ? createCalendarEvent({
                  userId: booking.tutorId,
                  summary: eventTitle,
                  description: eventDescription,
                  start: startDate,
                  end: endDate,
                  location: "https://edyfra-v2.vercel.app/study-room/" + bookingId,
                })
              : Promise.resolve(null),
          ]);
        } catch (e) {
          console.error("Failed to create calendar events:", e);
        }
      } catch (e) {
        console.error("Failed to schedule booking reminders:", e);
      }
    } else if (status === "declined") {
      await notifyUser(booking.studentId, {
        type: "BOOKING_DECLINED",
        title: "Booking Declined",
        body: `${booking.tutorName || "Your tutor"} declined your ${booking.subject} session request.`,
        actionUrl: "/dashboard/tutors",
      });
    } else if (status === "active") {
      await notifyUser(booking.studentId, {
        type: "SESSION_STARTED",
        title: "Session Started!",
        body: `Your ${booking.subject} session with ${booking.tutorName || "your tutor"} has started. Join now!`,
        actionUrl: `/study-room/${bookingId}`,
      });
    } else if (status === "completed") {
      await notifyUser(booking.studentId, {
        type: "SESSION_COMPLETE",
        title: "Session Completed",
        body: `Great session with ${booking.tutorName || "your tutor"}! Leave a review.`,
        actionUrl: `/dashboard/sessions`,
      });
      if (booking.tutorId) {
        await decrementTutorActiveSessions(booking.tutorId);
      }
    }

    if (status === "confirmed") {
      const { notifyUser } = await import("./notifications");
      await notifyUser(booking.studentId, {
        type: "TUTOR_ACCEPTED",
        title: "Booking Confirmed!",
        body: `Your ${booking.subject} session has been accepted. Get ready to learn!`,
        actionUrl: `/study-room/${booking.id}`,
      });
    }

    revalidatePath("/tutor");
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
    if (!user) throw new Error("Unauthorized");

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

    return { success: true, bookingId: res.bookingId };
  } catch (error) {
    console.error("Error in createBooking:", error);
    return { success: false, error: "Failed to create booking" };
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
    return await pythonGetBookingSessionData(bookingId);
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
