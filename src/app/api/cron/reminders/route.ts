import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/notifications";

export const dynamic = "force-dynamic"; // Ensure it runs dynamically
export const maxDuration = 60; // Allow enough time for cron

export async function GET(request: Request) {
  try {
    // Check for authorization header if using Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const now = new Date();

    // Fetch pending reminders that are due
    const reminders = await prisma.bookingReminder.findMany({
      where: {
        sentAt: null,
        scheduledFor: { lte: now },
      },
      include: {
        booking: {
          include: {
            tutor: { select: { name: true } },
            student: { select: { name: true } },
          }
        }
      },
      take: 50, // Process in batches to avoid timeouts
    });

    if (reminders.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No pending reminders" });
    }

    let processedCount = 0;

    for (const reminder of reminders) {
      // Only send if the booking is still confirmed
      if (reminder.booking.status === "confirmed") {
        const isStudent = reminder.userId === reminder.booking.studentId;
        const otherPerson = isStudent ? reminder.booking.tutor.name : reminder.booking.student.name;

        let title = "Upcoming Session Reminder";
        let body = `Your session with ${otherPerson} for ${reminder.booking.subject} is coming up.`;

        if (reminder.reminderType === "24hr") {
          body = `Your session with ${otherPerson} is tomorrow at ${reminder.booking.startTime}.`;
        } else if (reminder.reminderType === "30min") {
          body = `Your session with ${otherPerson} starts in 30 minutes. Get ready!`;
        } else if (reminder.reminderType === "10min") {
          title = "Heads up — session soon!";
          // Tutors get 10 min so they can prep; copy is friendlier for them.
          body = isStudent
            ? `Your ${reminder.booking.subject} session with ${otherPerson} starts in 10 minutes. Get ready to join!`
            : `Your ${reminder.booking.subject} session with ${otherPerson} starts in 10 minutes. Open the room and get set up.`;
        } else if (reminder.reminderType === "5min") {
          title = "Session starting soon!";
          // Students get 5 min — sharper call-to-action.
          body = `Your session with ${otherPerson} starts in 5 minutes. Join the room now.`;
        }

        try {
          await notifyUser(reminder.userId, {
            type: "UPCOMING_SESSION",
            title,
            body,
            actionUrl: `/study-room/${reminder.booking.id}`,
          });
          processedCount++;
        } catch (e) {
          console.error(`Failed to send reminder ${reminder.id}:`, e);
        }
      }

      // Always mark as sent to avoid retrying declined/cancelled bookings forever
      await prisma.bookingReminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    console.error("Error processing reminders cron:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
