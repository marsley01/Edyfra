export interface IcalBookingData {
  id: string;
  subject: string;
  topic?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  tutorName?: string;
  studentName?: string;
  meetingUrl?: string;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatICalDateTime(date: string, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const year = parseInt(date.slice(0, 4));
  const month = parseInt(date.slice(5, 7));
  const day = parseInt(date.slice(8, 10));

  const eatDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const utcDate = new Date(eatDate.getTime() - 3 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    utcDate.getUTCFullYear().toString() +
    pad(utcDate.getUTCMonth() + 1) +
    pad(utcDate.getUTCDate()) +
    "T" +
    pad(utcDate.getUTCHours()) +
    pad(utcDate.getUTCMinutes()) +
    pad(utcDate.getUTCSeconds()) +
    "Z"
  );
}

export function generateICSContent(booking: IcalBookingData): string {
  const startDateTime = formatICalDateTime(booking.date, booking.startTime);
  const endDateTime = formatICalDateTime(booking.date, booking.endTime);

  const summary = escapeIcsText(
    `${booking.subject}${booking.topic ? `: ${booking.topic}` : ""} Session on Edyfra`,
  );

  const attendeeName = booking.tutorName
    ? escapeIcsText(booking.tutorName)
    : escapeIcsText(booking.studentName || "Edyfra User");

  const description = escapeIcsText(
    `${booking.tutorName || booking.studentName || "Your study partner"} - Edyfra session\n${
      booking.meetingUrl || "Join via Edyfra"
    }`,
  );

  const location = booking.meetingUrl || "https://edyfra-v2.vercel.app/study-room/" + booking.id;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Edyfra//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:edyfra-booking-${booking.id}@edyfra.com`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `LOCATION:${escapeIcsText(location)}`,
    `ATTENDEE;CN=${attendeeName};ROLE=REQ-PARTICIPANT:MAILTO:`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Edyfra study session in 24 hours",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Edyfra study session in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
