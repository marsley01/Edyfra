import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { generateICSContent, type IcalBookingData } from "@/lib/calendar/ics";
import { getAppUrl } from "@/lib/app-url";

/**
 * GET /api/calendar/[bookingId] — download an .ics file for a booking.
 *
 * Reads the booking directly: the Python session-data payload this used to go
 * through has no date/endTime and names the tutor `partnerId`, so tutors were
 * always rejected and student files had an invalid date.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { name: true } },
      tutor: { select: { name: true } },
    },
  });

  if (!booking || (booking.studentId !== user.id && booking.tutorId !== user.id)) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const icalData: IcalBookingData = {
    id: booking.id,
    subject: booking.subject,
    topic: booking.topic,
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationMinutes: booking.durationMinutes,
    tutorName: booking.tutor?.name,
    studentName: booking.student?.name,
    meetingUrl: booking.meetingUrl || `${getAppUrl()}/study-room/${booking.id}`,
  };

  const content = generateICSContent(icalData);
  const safeSubject = booking.subject.replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `edyfra-${safeSubject}-${booking.id}.ics`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
