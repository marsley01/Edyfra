"use server";

import prisma from "@/lib/prisma";
import { getUserData } from "./user";
import { revalidatePath } from "next/cache";

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
    if (!user) throw new Error("Unauthorized");
    
    const targetId = tutorId || user.id;
    if (user.id !== targetId && user.role !== "ADMIN") throw new Error("Unauthorized");

    // Start a transaction: clear existing recurring availability and insert new ones
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

// Additional booking actions will go here

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
        student: { select: { name: true, avatar: true } },
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

    const booking = await prisma.booking.update({
      where: { id: bookingId, tutorId: user.id },
      data: { status, declineReason: reason },
    });

    if (status === "declined") {
      await prisma.sessionFlag.create({
        data: {
          tutorId: user.id,
          flagType: "declined",
          bookingId: booking.id,
        }
      });
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

    // Fetch confirmed bookings that haven't ended yet
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

    // Compute endTime
    const [hours, minutes] = startTime.split(":").map(Number);
    const endTotalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = Math.floor(endTotalMinutes / 60) % 24;
    const endM = endTotalMinutes % 60;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    const booking = await prisma.booking.create({
      data: {
        studentId: user.id,
        tutorId: tutorId,
        status: "pending",
        subject,
        topic,
        date: new Date(date),
        startTime,
        endTime,
        durationMinutes,
      }
    });

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

    // Fetch confirmed bookings that haven't ended yet
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
        tutor: { select: { name: true, avatar: true } }
      }
    });

    if (!booking) return null;

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
    };
  } catch (error) {
    console.error('Error fetching booking session:', error);
    return null;
  }
}

export async function convertBookingToMashAI(bookingId: string) {
  try {
    const user = await getUserData();
    if (!user) return { success: false, error: "Unauthorized" };

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== user.id) return { success: false, error: "Not found" };

    await prisma.sessionFlag.create({
      data: {
        tutorId: booking.tutorId,
        flagType: "no_show",
        bookingId: booking.id,
      }
    });
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "tutor_no_show" }
    });
    
    const { randomBytes } = await import("crypto");
    const roomId = `mash-${randomBytes(8).toString('hex')}`;
    
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
