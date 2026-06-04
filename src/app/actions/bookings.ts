"use server";

import prisma from "@/lib/prisma";
import { getUserData } from "./user";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/app/actions/notifications";
import { decrementTutorActiveSessions } from "./match-algorithm";
import { StreamChat } from "stream-chat";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

/**
 * Format a date to "Mon, 12 Jun" style
 */
function formatDay(date: Date): string {
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Convert a UTC time to EAT display time
 */
function formatEAT(startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period} EAT`;
}

export async function getTutorAvailability(tutorId?: string) {
  try {
    const targetTutorId = tutorId || (await getUserData())?.id;
    if (!targetTutorId) throw new Error("Unauthorized");

    return await prisma.tutorAvailability.findMany({
      where: { tutorId: targetTutorId },
    });
  } catch (error) {
    console.error("Error in getTutorAvailability:", error);
    return [];
  }
}

export async function saveTutorAvailability(tutorId: string, slots: any[]) {
  try {
    const user = await getUserData();
    if (!user || user.id !== tutorId) throw new Error("Unauthorized");

    await prisma.$transaction([
      prisma.tutorAvailability.deleteMany({
        where: { tutorId: user.id, isRecurring: true },
      }),
      prisma.tutorAvailability.createMany({
        data: slots.map(slot => ({
          tutorId: user.id,
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isRecurring: slot.is_recurring,
          isBlocked: slot.is_blocked,
        })),
      }),
    ]);

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

    return await prisma.booking.findMany({
      where: {
        tutorId: user.id,
        status: "pending",
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error in getIncomingBookingRequests:", error);
    return [];
  }
}

export async function updateBookingStatus(bookingId: string, status: string, reason?: string) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
      },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.tutorId !== user.id) throw new Error("Unauthorized");

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "declined", "expired"],
      confirmed: ["active", "cancelled"],
      active: ["completed", "student_no_show", "tutor_no_show"],
    };

    const currentStatus = booking.status;
    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${status}`);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status, declineReason: reason },
    });

    // Notifications based on status
    if (status === "confirmed") {
      await notifyUser(booking.studentId, {
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed!",
        body: `${booking.tutor.name} has accepted your ${booking.subject} session on ${formatDay(booking.date)} at ${formatEAT(booking.startTime)}.`,
        actionUrl: `/study-room/${bookingId}`,
      });

      // Schedule session reminders: student 5min before, tutor 10min before.
      // Past reminders are skipped — the cron will silently drop them anyway,
      // but we don't pollute the booking_reminders table with dead rows.
      try {
        const sessionDate = new Date(booking.date);
        const [hours, minutes] = booking.startTime.split(":").map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const reminder10 = new Date(sessionDate.getTime() - 10 * 60 * 1000);
        const reminder5 = new Date(sessionDate.getTime() - 5 * 60 * 1000);

        const rows: Array<{
          bookingId: string;
          userId: string;
          reminderType: string;
          scheduledFor: Date;
        }> = [];

        if (reminder10 > now) {
          rows.push({
            bookingId: booking.id,
            userId: booking.tutorId,
            reminderType: "10min",
            scheduledFor: reminder10,
          });
        }
        if (reminder5 > now) {
          rows.push({
            bookingId: booking.id,
            userId: booking.studentId,
            reminderType: "5min",
            scheduledFor: reminder5,
          });
        }

        if (rows.length > 0) {
          await prisma.bookingReminder.createMany({ data: rows });
        }
      } catch (e) {
        console.error("Failed to schedule booking reminders:", e);
      }
    } else if (status === "declined") {
      await prisma.sessionFlag.create({
        data: {
          tutorId: user.id,
          flagType: "declined",
          bookingId: booking.id,
        }
      });
      await notifyUser(booking.studentId, {
        type: "BOOKING_DECLINED",
        title: "Booking Declined",
        body: `${booking.tutor.name} declined your ${booking.subject} session request.`,
        actionUrl: "/dashboard/tutors",
      });
    } else if (status === "active") {
      await notifyUser(booking.studentId, {
        type: "SESSION_STARTED",
        title: "Session Started!",
        body: `Your ${booking.subject} session with ${booking.tutor.name} has started. Join now!`,
        actionUrl: `/study-room/${bookingId}`,
      });
    } else if (status === "completed") {
      await notifyUser(booking.studentId, {
        type: "SESSION_COMPLETE",
        title: "Session Completed",
        body: `Great session with ${booking.tutor.name}! Leave a review.`,
        actionUrl: `/dashboard/sessions`,
      });
      if (booking.tutorId) {
        await decrementTutorActiveSessions(booking.tutorId);
      }
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

    return await prisma.booking.findMany({
      where: {
        tutorId: user.id,
        status: "confirmed",
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        student: { select: { name: true, avatar: true } },
      },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" }
      ],
    });
  } catch (error) {
    console.error("Error in getUpcomingBookings:", error);
    return [];
  }
}

export async function createBooking(tutorId: string, subject: string, topic: string, date: string, startTime: string, durationMinutes: number) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    // Compute endTime (UTC storage)
    const [hours, minutes] = startTime.split(":").map(Number);
    const endTotalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = Math.floor(endTotalMinutes / 60) % 24;
    const endM = endTotalMinutes % 60;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    // Store date in UTC
    const bookingDate = new Date(date + "T00:00:00Z");

    const booking = await prisma.booking.create({
      data: {
        studentId: user.id,
        tutorId: tutorId,
        status: "pending",
        subject,
        topic,
        date: bookingDate,
        startTime,
        endTime,
        durationMinutes,
      },
      include: {
        tutor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    // Notify the tutor about the new booking request
    try {
      const dayFormatted = formatDay(bookingDate);
      const timeFormatted = formatEAT(startTime);
      await notifyUser(tutorId, {
        type: "NEW_BOOKING",
        title: "New booking request 📅",
        body: `${user.name} wants a ${subject} session on ${dayFormatted} at ${timeFormatted}`,
        actionUrl: "/tutor-dashboard",
      });
    } catch (e) {
      console.error("Failed to notify tutor of new booking:", e);
    }

    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error("Error in createBooking:", error);
    return { success: false, error: "Failed to create booking" };
  }
}

export async function getUpcomingStudentBookings() {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    return await prisma.booking.findMany({
      where: {
        studentId: user.id,
        status: { in: ["confirmed", "pending"] },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        tutor: { select: { name: true, avatar: true } },
      },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" }
      ],
    });
  } catch (error) {
    console.error("Error in getUpcomingStudentBookings:", error);
    return [];
  }
}

export async function getBookingSessionData(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { name: true, avatar: true } },
        tutor: { select: { name: true, avatar: true } },
      },
    });

    if (!booking) return null;

    // Compute join window based on EAT time
    const now = new Date();
    const eatNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const sessionDate = new Date(booking.date);
    const [hours, minutes] = booking.startTime.split(":").map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);
    const sessionStartEAT = new Date(sessionDate.getTime());
    const minutesUntilSession = (sessionStartEAT.getTime() - eatNow.getTime()) / (1000 * 60);
    const canJoin = minutesUntilSession <= 5 && minutesUntilSession >= -30;

    return {
      id: booking.id,
      tier: "TUTOR",
      subject: booking.subject,
      topic: booking.topic,
      status: booking.status === "confirmed" ? "ACTIVE" : booking.status,
      studentId: booking.studentId,
      partnerId: booking.tutorId,
      student: booking.student,
      partner: booking.tutor,
      roomId: booking.id,
      canJoin,
      startTimeEAT: formatEAT(booking.startTime),
      minutesUntilSession,
    };
  } catch (error) {
    console.error("Error fetching booking session:", error);
    return null;
  }
}

export async function convertBookingToMashAI(bookingId: string) {
  try {
    const user = await getUserData();
    if (!user) return { success: false, error: "Unauthorized" };

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== user.id) return { success: false, error: "Not found" };

    // Mark as tutor_no_show
    await prisma.sessionFlag.create({
      data: {
        tutorId: booking.tutorId,
        flagType: "no_show",
        bookingId: booking.id,
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "tutor_no_show" },
    });

    if (booking.tutorId) {
      await decrementTutorActiveSessions(booking.tutorId);
    }

    const { randomBytes } = await import("crypto");
    const roomId = `mash-${randomBytes(8).toString("hex")}`;

    const session = await prisma.session.create({
      data: {
        studentId: user.id,
        partnerId: null,
        tier: "MASH",
        subject: booking.subject,
        topic: booking.topic,
        status: "ACTIVE",
        roomId,
        startedAt: new Date(),
      },
    });

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error converting booking to Mash AI:", error);
    return { success: false, error: "Internal error" };
  }
}

/**
 * Handle booking expiration: if tutor doesn't respond in 2 hours, mark as expired
 */
export async function expirePendingBookings() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const expired = await prisma.booking.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: twoHoursAgo },
      },
      data: { status: "expired" },
    });

    // Notify students whose bookings expired
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "expired",
        createdAt: { lt: twoHoursAgo },
      },
      include: { student: { select: { id: true } }, tutor: { select: { name: true } } },
    });

    for (const b of expiredBookings) {
      await notifyUser(b.studentId, {
        type: "BOOKING_EXPIRED",
        title: "Booking Expired",
        body: `Your booking with ${b.tutor?.name || "a tutor"} has expired because they didn't respond in time.`,
        actionUrl: "/dashboard/tutors",
      });
    }

    return { success: true, expired: expired.count };
  } catch (error) {
    console.error("Error expiring bookings:", error);
    return { success: false, error: "Internal error" };
  }
}
