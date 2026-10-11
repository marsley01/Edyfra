import { describe, expect, it } from "vitest";
import { isRequestLive, isTutorPresent, LIVE_HEARTBEAT_MS, TUTOR_PRESENCE_MS } from "../match-flow";

const now = new Date("2026-10-11T10:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("isRequestLive", () => {
  it("is live while the student keeps polling", () => {
    expect(isRequestLive({ createdAt: ago(80_000), lastSeenAt: ago(2_000) }, now)).toBe(true);
  });
  it("goes stale once polling stops, whatever the request's age", () => {
    expect(isRequestLive({ createdAt: ago(20_000), lastSeenAt: ago(LIVE_HEARTBEAT_MS + 1) }, now)).toBe(false);
  });
  it("falls back to createdAt for requests made before the heartbeat existed", () => {
    expect(isRequestLive({ createdAt: ago(3_000), lastSeenAt: null }, now)).toBe(true);
    expect(isRequestLive({ createdAt: ago(60_000), lastSeenAt: null }, now)).toBe(false);
  });
});

describe("isTutorPresent", () => {
  it("needs the switch on and a recent dashboard check-in", () => {
    expect(isTutorPresent({ isOnline: true, lastSeenAt: ago(30_000).toISOString() }, now)).toBe(true);
  });
  it("ignores a switch left on by a tutor who walked away", () => {
    expect(isTutorPresent({ isOnline: true, lastSeenAt: ago(TUTOR_PRESENCE_MS + 1).toISOString() }, now)).toBe(false);
    expect(isTutorPresent({ isOnline: true }, now)).toBe(false);
  });
  it("is offline when the switch is off", () => {
    expect(isTutorPresent({ isOnline: false, lastSeenAt: now.toISOString() }, now)).toBe(false);
    expect(isTutorPresent(null, now)).toBe(false);
  });
});
