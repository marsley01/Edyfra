import { describe, expect, it } from "vitest";
import { rankPeers, recencyScore, scorePeer, PEER_WEIGHTS, RECENCY_HALF_LIFE_HOURS, type StudentLike } from "../student-discovery";

const now = new Date("2026-10-08T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const viewer: StudentLike = {
  id: "me",
  subjects: ["Mathematics", "Physics", "Chemistry"],
  educationLevel: "HIGH_SCHOOL",
  form: "Form 3",
  county: "Nairobi",
  lastActiveAt: now,
};

function peer(id: string, o: Partial<StudentLike> = {}): StudentLike {
  return {
    id,
    subjects: ["Mathematics"],
    educationLevel: "HIGH_SCHOOL",
    form: "Form 3",
    county: "Nairobi",
    lastActiveAt: hoursAgo(1),
    ...o,
  };
}

describe("scorePeer", () => {
  it("weights sum to 1", () => {
    expect(Object.values(PEER_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("excludes self and students with no shared subject", () => {
    expect(scorePeer(viewer, { ...viewer }, now)).toBeNull();
    expect(scorePeer(viewer, peer("x", { subjects: ["History"] }), now)).toBeNull();
  });

  it("matches subjects case- and alias-insensitively", () => {
    const p = scorePeer(viewer, peer("x", { subjects: ["maths", "PHYSICS"] }), now);
    expect(p?.sharedSubjects.sort()).toEqual(["mathematics", "physics"]);
  });

  it("requires the requested subject when given", () => {
    expect(scorePeer(viewer, peer("x", { subjects: ["Physics"] }), now, { requiredSubject: "Mathematics" })).toBeNull();
    expect(scorePeer(viewer, peer("x"), now, { requiredSubject: "Maths" })).not.toBeNull();
  });

  it("level: same form scores full, different EduLevel scores zero", () => {
    expect(scorePeer(viewer, peer("a"), now)!.components.level).toBe(1);
    expect(scorePeer(viewer, peer("b", { form: "F3" }), now)!.components.level).toBe(1);
    expect(scorePeer(viewer, peer("c", { form: "Form 1" }), now)!.components.level).toBe(0.5);
    expect(scorePeer(viewer, peer("d", { educationLevel: "UNIVERSITY", form: null }), now)!.components.level).toBe(0);
  });

  it("recency halves every half-life and is 0 when never active", () => {
    expect(recencyScore(now, now)).toBe(1);
    expect(recencyScore(hoursAgo(RECENCY_HALF_LIFE_HOURS), now)).toBeCloseTo(0.5);
    expect(recencyScore(null, now)).toBe(0);
  });
});

describe("rankPeers ordering", () => {
  it("more shared subjects first", () => {
    const ids = rankPeers(viewer, [peer("one"), peer("three", { subjects: ["Mathematics", "Physics", "Chemistry"] })], now).map(
      (p) => p.id,
    );
    expect(ids).toEqual(["three", "one"]);
  });

  it("same county beats different county, all else equal", () => {
    const ids = rankPeers(viewer, [peer("far", { county: "Kisumu" }), peer("near")], now).map((p) => p.id);
    expect(ids).toEqual(["near", "far"]);
  });

  it("recently active beats long inactive", () => {
    const ids = rankPeers(viewer, [peer("stale", { lastActiveAt: hoursAgo(24 * 30) }), peer("fresh", { lastActiveAt: hoursAgo(0.1) })], now).map(
      (p) => p.id,
    );
    expect(ids).toEqual(["fresh", "stale"]);
  });

  it("is stable by id on exact ties and drops excluded candidates", () => {
    const ids = rankPeers(viewer, [peer("b"), peer("a"), peer("x", { subjects: [] }), { ...viewer }], now).map((p) => p.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("a viewer without subjects still gets ranked suggestions", () => {
    const ids = rankPeers({ ...viewer, subjects: [] }, [peer("far", { county: "Kisumu" }), peer("near")], now).map((p) => p.id);
    expect(ids).toEqual(["near", "far"]);
  });
});
