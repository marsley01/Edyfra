import { describe, it, expect } from "vitest";
import { parseIcalToBlocks } from "../ical-sync";

const FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
DTSTART:20260820T100000Z
DTEND:20260820T110000Z
UID:evt-single@google.com
SUMMARY:Busy hour
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Africa/Nairobi:20260821T140000
DTEND;TZID=Africa/Nairobi:20260821T153000
UID:evt-tzid@google.com
SUMMARY:Nairobi local time
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260822
DTEND;VALUE=DATE:20260824
UID:evt-allday@google.com
SUMMARY:Conference
END:VEVENT
BEGIN:VEVENT
DTSTART:20260823T090000Z
DURATION:PT2H
UID:evt-dur@google.com
SUMMARY:Duration event
END:VEVENT
BEGIN:VEVENT
DTSTART:20260810T080000Z
DTEND:20260810T090000Z
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260831T000000Z
UID:evt-recurring@google.com
SUMMARY:Weekly classes
EXDATE:20260824T080000Z
END:VEVENT
BEGIN:VEVENT
DTSTART:20260801T000000Z
DTEND:20260801T010000Z
UID:evt-past@google.com
SUMMARY:Old event
END:VEVENT
END:VCALENDAR`;

describe("parseIcalToBlocks", () => {
  const windowStart = new Date("2026-08-20T00:00:00Z");
  const windowEnd = new Date("2026-09-19T00:00:00Z");

  it("parses UTC events", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    const single = blocks.find((b) => b.externalUid.startsWith("evt-single@google.com"));
    expect(single).toBeDefined();
    expect(single!.startAt).toBe("2026-08-20T10:00:00.000Z");
    expect(single!.endAt).toBe("2026-08-20T11:00:00.000Z");
  });

  it("converts TZID times to UTC", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    const tzid = blocks.find((b) => b.externalUid.startsWith("evt-tzid@google.com"));
    expect(tzid).toBeDefined();
    // Africa/Nairobi is UTC+3, so 14:00 local = 11:00 UTC
    expect(tzid!.startAt).toBe("2026-08-21T11:00:00.000Z");
    expect(tzid!.endAt).toBe("2026-08-21T12:30:00.000Z");
  });

  it("handles all-day events as full-day blocks", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    const allday = blocks.find((b) => b.externalUid.startsWith("evt-allday@google.com"));
    expect(allday).toBeDefined();
    expect(allday!.startAt).toBe("2026-08-22T00:00:00.000Z");
    expect(allday!.endAt).toBe("2026-08-24T00:00:00.000Z");
  });

  it("applies DURATION when DTEND is missing", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    const dur = blocks.find((b) => b.externalUid.startsWith("evt-dur@google.com"));
    expect(dur).toBeDefined();
    expect(dur!.startAt).toBe("2026-08-23T09:00:00.000Z");
    expect(dur!.endAt).toBe("2026-08-23T11:00:00.000Z");
  });

  it("expands weekly RRULE and honors EXDATE", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    const rec = blocks.filter((b) => b.externalUid.startsWith("evt-recurring@google.com"));
    // DTSTART Mon Aug 10, FREQ=WEEKLY BYDAY=MO,WE,FR until 2026-08-31T00:00Z (inclusive)
    // In-window occurrences: Aug 21, 26, 28 (Aug 24 excluded via EXDATE; Aug 31 08:00Z > UNTIL, so excluded)
    expect(rec.length).toBe(3);
    expect(rec.some((b) => b.externalUid.includes("2026-08-24"))).toBe(false); // excluded
    expect(rec.some((b) => b.externalUid.includes("2026-08-21"))).toBe(true);
    expect(rec.some((b) => b.externalUid.includes("2026-08-26"))).toBe(true);
    expect(rec.some((b) => b.externalUid.includes("2026-08-28"))).toBe(true);
    expect(rec.some((b) => b.externalUid.includes("2026-08-31"))).toBe(false); // past UNTIL
  });

  it("skips events entirely outside the window", () => {
    const blocks = parseIcalToBlocks(FIXTURE, { windowStart, windowEnd });
    expect(blocks.some((b) => b.externalUid.startsWith("evt-past@google.com"))).toBe(false);
  });
});