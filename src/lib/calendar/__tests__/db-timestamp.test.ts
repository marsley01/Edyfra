import { createHmac } from "crypto";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { isDbTimestampExpired, parseDbTimestamp } from "../db-timestamp";

describe("parseDbTimestamp", () => {
  it("treats naive Postgres strings as UTC, not local time", () => {
    // Prisma maps DateTime to `timestamp without time zone`, so PostgREST returns
    // this shape. Parsing it as local time made every token look expired on a
    // machine east of UTC.
    const parsed = parseDbTimestamp("2026-10-01T20:36:53.336");
    expect(parsed?.toISOString()).toBe("2026-10-01T20:36:53.336Z");
  });

  it("preserves an explicit Z", () => {
    const parsed = parseDbTimestamp("2026-10-01T20:36:53.336Z");
    expect(parsed?.toISOString()).toBe("2026-10-01T20:36:53.336Z");
  });

  it("preserves an explicit offset", () => {
    const parsed = parseDbTimestamp("2026-10-01T23:36:53.336+03:00");
    expect(parsed?.toISOString()).toBe("2026-10-01T20:36:53.336Z");
  });

  it("accepts a space-separated timestamp", () => {
    const parsed = parseDbTimestamp("2026-10-01 20:36:53.336");
    expect(parsed?.toISOString()).toBe("2026-10-01T20:36:53.336Z");
  });

  it("passes Date objects through", () => {
    const d = new Date("2026-10-01T20:36:53.336Z");
    expect(parseDbTimestamp(d)).toBe(d);
  });

  it("returns null for empty input", () => {
    expect(parseDbTimestamp(null)).toBeNull();
    expect(parseDbTimestamp(undefined)).toBeNull();
    expect(parseDbTimestamp("")).toBeNull();
  });

  it("returns null for unparseable input instead of an Invalid Date", () => {
    expect(parseDbTimestamp("not-a-date")).toBeNull();
  });
});

describe("isDbTimestampExpired", () => {
  const now = Date.parse("2026-10-01T20:36:53.336Z");

  it("is false for a future UTC timestamp", () => {
    expect(isDbTimestampExpired("2026-10-01T21:36:53.336", now)).toBe(false);
  });

  it("is true for a past UTC timestamp", () => {
    expect(isDbTimestampExpired("2026-10-01T19:36:53.336", now)).toBe(true);
  });

  it("treats a null expiry as expired so callers refresh", () => {
    expect(isDbTimestampExpired(null, now)).toBe(true);
  });
});

// Mirrors the hook's signature check: the regression that shipped a silently
// rejecting endpoint was splitting `v1,<sig>` on "," instead of whitespace.
describe("svix signature format", () => {
  // Throwaway key generated for this test only — never a real hook secret.
  const secret = `v1,whsec_${Buffer.from("edyfra-test-only-signing-key-0001").toString("base64")}`;
  const body = JSON.stringify({ user: { email: "a@b.c" } });
  const id = "msg_1";
  const ts = "1790887552";

  const keyOf = (s: string) =>
    Buffer.from((s.includes(",") ? s.split(",")[1] : s).replace(/^whsec_/, ""), "base64");

  const sign = (payload: string, secretValue = secret) =>
    createHmac("sha256", keyOf(secretValue)).update(`${id}.${ts}.${payload}`).digest("base64");

  beforeEach(() => {
    delete process.env.SEND_EMAIL_HOOK_SECRETS;
  });
  afterEach(() => {
    delete process.env.SEND_EMAIL_HOOK_SECRETS;
  });

  const parse = (header: string) =>
    header
      .trim()
      .split(/\s+/)
      .filter((p) => p.startsWith("v1,"))
      .map((p) => p.slice(3));

  it("extracts a single v1 signature", () => {
    expect(parse(`v1,${sign(body)}`)).toEqual([sign(body)]);
  });

  it("extracts multiple whitespace-separated signatures", () => {
    const header = `v1,${sign(body)} v1,${sign(body, "whsec_other")}`;
    expect(parse(header)).toHaveLength(2);
  });

  it("returns nothing for a comma-only split, which was the original bug", () => {
    const header = `v1,${sign(body)}`;
    expect(header.split(",").filter((p) => p.startsWith("v1,"))).toHaveLength(0);
  });

  it("ignores unknown key ids", () => {
    expect(parse(`v2,${sign(body)}`)).toHaveLength(0);
  });
});
