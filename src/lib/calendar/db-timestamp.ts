/**
 * Postgres timestamp helpers.
 *
 * Prisma maps `DateTime` to `timestamp(3) without time zone`, so the values that
 * PostgREST hands back look like `2026-10-01T20:36:53.336` — no `Z`, no offset.
 *
 * `new Date("2026-10-01T20:36:53.336")` parses a naive ISO string as *local*
 * time. On a UTC+3 machine that turns 20:36 UTC into 20:36+03:00, i.e. three
 * hours in the past, and every "is this still valid?" comparison quietly
 * answers "expired". That is what made Google Calendar sync fail for every user
 * regardless of credentials.
 *
 * Values written back with `.toISOString()` carry a `Z`, which Postgres strips
 * when it casts to `timestamp without time zone`, so reads are naive UTC again.
 * Both shapes therefore need to be treated as UTC here.
 */

const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse a timestamp read back from Postgres into a correct `Date`.
 * Naive strings are interpreted as UTC, matching how they were stored.
 */
export function parseDbTimestamp(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const normalized = HAS_TIMEZONE.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True when a stored expiry timestamp is in the past. A null expiry is treated
 * as expired so callers refresh instead of using a token they cannot trust.
 */
export function isDbTimestampExpired(
  value: string | Date | null | undefined,
  now: number = Date.now(),
): boolean {
  const parsed = parseDbTimestamp(value);
  if (!parsed) return true;
  return parsed.getTime() < now;
}
