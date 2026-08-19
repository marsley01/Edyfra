/**
 * Shared iCal parser for Supabase Edge Functions (Deno).
 * Mirrors src/lib/calendar/ical-sync.ts — keep both in sync when fixing bugs.
 *
 * Handles the common shapes found in Google Calendar's public "Secret address
 * in iCal format" export: UTC/numeric-offset/TZID date-times, all-day events,
 * DURATION, and basic RRULE expansion bounded to a 30-day window.
 */

export interface CalendarBlock {
  externalUid: string;
  startAt: string;
  endAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface RawEvent {
  uid: string;
  start: Date;
  end: Date;
  allDay: boolean;
  rrule?: string;
  exdates: number[];
}

function unfoldIcal(text: string): string[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  return unfolded.split(/\r?\n/).filter((l) => l.trim().length > 0);
}

function parseParams(fullValue: string): { params: string[]; value: string } {
  const colon = fullValue.indexOf(":");
  const paramsPart = colon === -1 ? "" : fullValue.slice(0, colon);
  const value = colon === -1 ? fullValue : fullValue.slice(colon + 1);
  return { params: paramsPart.split(";").filter(Boolean), value };
}

function getParam(params: string[], name: string): string | undefined {
  const hit = params.find((p) => p.toUpperCase().startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
}

function tzOffsetMinutes(timeZone: string, wallTime: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts: Record<string, string> = {};
    for (const p of dtf.formatToParts(wallTime)) parts[p.type] = p.value;
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second) || 0,
    );
    return Math.round((asUtc - wallTime.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function parseIcalDateTime(raw: string): Date {
  const { params, value } = parseParams(raw);
  const tzid = getParam(params, "TZID");
  const isDateOnly = !value.includes("T");

  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const dateTimeMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{4})?$/,
  );

  if (isDateOnly && dateMatch) {
    return new Date(
      Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])),
    );
  }

  if (!dateTimeMatch) return new Date(NaN);

  const [, y, mo, d, h, mi, s, zone] = dateTimeMatch;
  const wallUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));

  if (zone === "Z") return new Date(wallUtc);
  if (zone) {
    const sign = zone.startsWith("-") ? -1 : 1;
    const off = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5)));
    return new Date(wallUtc - off * 60000);
  }
  if (tzid) {
    const wall = new Date(wallUtc);
    return new Date(wallUtc - tzOffsetMinutes(tzid, wall) * 60000);
  }
  return new Date(wallUtc);
}

function parseDuration(raw: string): number {
  const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1]) || 0;
  const minutes = Number(match[2]) || 0;
  const seconds = Number(match[3]) || 0;
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

interface Rrule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count?: number;
  until?: Date;
  byday: string[];
}

function parseRrule(rrule: string): Rrule {
  const fields: Record<string, string> = {};
  for (const part of rrule.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    fields[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  const freq = (fields.FREQ || "WEEKLY").toUpperCase() as Rrule["freq"];
  return {
    freq: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq) ? freq : "WEEKLY",
    interval: Math.max(1, Number(fields.INTERVAL) || 1),
    count: fields.COUNT ? Number(fields.COUNT) : undefined,
    until: fields.UNTIL ? parseIcalDateTime(fields.UNTIL) : undefined,
    byday: (fields.BYDAY || "").split(",").filter(Boolean),
  };
}

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function advanceDate(cursor: Date, freq: "MONTHLY" | "YEARLY", interval: number): Date {
  if (freq === "MONTHLY") {
    return new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth() + interval,
        cursor.getUTCDate(),
        cursor.getUTCHours(),
        cursor.getUTCMinutes(),
        cursor.getUTCSeconds(),
      ),
    );
  }
  return new Date(
    Date.UTC(
      cursor.getUTCFullYear() + interval,
      cursor.getUTCMonth(),
      cursor.getUTCDate(),
      cursor.getUTCHours(),
      cursor.getUTCMinutes(),
      cursor.getUTCSeconds(),
    ),
  );
}

function expandOccurrences(
  start: Date,
  rrule: Rrule,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(start);
  let seen = 0;
  const maxIterations = 5000;

  while (seen < maxIterations) {
    if (rrule.until && cursor.getTime() > rrule.until.getTime()) break;
    if (rrule.count !== undefined && occurrences.length >= rrule.count) break;
    if (cursor.getTime() > windowEnd.getTime()) break;

    if (rrule.freq === "WEEKLY" && rrule.byday.length > 0) {
      const weekStart = new Date(cursor);
      weekStart.setUTCHours(0, 0, 0, 0);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      for (const bd of rrule.byday) {
        const index = WEEKDAYS.indexOf(bd as (typeof WEEKDAYS)[number]);
        if (index === -1) continue;
        const occ = new Date(weekStart.getTime() + index * DAY_MS);
        occ.setUTCHours(cursor.getUTCHours(), cursor.getUTCMinutes(), cursor.getUTCSeconds(), 0);
        if (occ.getTime() < start.getTime()) continue;
        if (occ.getTime() < windowStart.getTime()) continue;
        if (occ.getTime() > windowEnd.getTime()) continue;
        if (rrule.until && occ.getTime() > rrule.until.getTime()) continue;
        if (rrule.count !== undefined && occurrences.length >= rrule.count) break;
        if (occurrences.some((o) => o.getTime() === occ.getTime())) continue;
        occurrences.push(occ);
      }
      cursor = new Date(cursor.getTime() + rrule.interval * 7 * DAY_MS);
    } else {
      if (
        cursor.getTime() >= start.getTime() &&
        cursor.getTime() >= windowStart.getTime() &&
        cursor.getTime() <= windowEnd.getTime()
      ) {
        if (occurrences.length < (rrule.count ?? Infinity)) {
          occurrences.push(cursor);
        }
      }
      if (rrule.freq === "MONTHLY" || rrule.freq === "YEARLY") {
        cursor = advanceDate(cursor, rrule.freq, rrule.interval);
      } else {
        cursor = new Date(cursor.getTime() + rrule.interval * DAY_MS);
      }
    }
    seen += 1;
  }

  return occurrences;
}

export function parseIcalToBlocks(
  icalText: string,
  opts: { windowStart: Date; windowEnd: Date },
): CalendarBlock[] {
  const lines = unfoldIcal(icalText);
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const line of lines) {
    const colon = line.indexOf(":");
    const key = (colon === -1 ? line : line.slice(0, colon)).toUpperCase();
    const value = colon === -1 ? "" : line.slice(colon + 1);

    if (key === "BEGIN" && value.toUpperCase() === "VEVENT") {
      current = { uid: "", start: new Date(0), end: new Date(0), allDay: false, exdates: [] };
    } else if (key === "END" && value.toUpperCase() === "VEVENT" && current) {
      if (current.uid && current.start.getTime() > 0) {
        if (current.end.getTime() <= current.start.getTime()) {
          current.end = new Date(current.start.getTime() + (current.allDay ? DAY_MS : 60 * 60 * 1000));
        }
        events.push(current);
      }
      current = null;
    } else if (current) {
      if (key === "UID") {
        current.uid = value.trim();
      } else if (key.startsWith("DTSTART")) {
        current.start = parseIcalDateTime(line);
        current.allDay = key.includes("VALUE=DATE");
      } else if (key.startsWith("DTEND")) {
        current.end = parseIcalDateTime(line);
      } else if (key.startsWith("DURATION")) {
        const durMs = parseDuration(value);
        if (durMs > 0) current.end = new Date(current.start.getTime() + durMs);
      } else if (key.startsWith("EXDATE")) {
        const ex = parseIcalDateTime(`${key}:${value}`);
        if (!Number.isNaN(ex.getTime())) current.exdates.push(ex.getTime());
      } else if (key === "RRULE") {
        current.rrule = value;
      }
    }
  }

  const { windowStart, windowEnd } = opts;
  const blocks: CalendarBlock[] = [];

  for (const ev of events) {
    const starts = ev.rrule
      ? expandOccurrences(ev.start, parseRrule(ev.rrule), windowStart, windowEnd)
      : [ev.start];

    for (const occStart of starts) {
      const durationMs = ev.end.getTime() - ev.start.getTime();
      const occEnd = new Date(occStart.getTime() + durationMs);
      if (occEnd.getTime() <= windowStart.getTime() || occStart.getTime() >= windowEnd.getTime()) continue;
      if (ev.exdates.includes(occStart.getTime())) continue;

      const blockStart = new Date(Math.max(occStart.getTime(), windowStart.getTime()));
      const blockEnd = new Date(Math.min(occEnd.getTime(), windowEnd.getTime()));
      if (blockEnd.getTime() <= blockStart.getTime()) continue;

      blocks.push({
        externalUid: `${ev.uid}_${occStart.toISOString()}`,
        startAt: blockStart.toISOString(),
        endAt: blockEnd.toISOString(),
      });
    }
  }

  return blocks;
}