import { describe, expect, it } from "vitest";
import {
  bayesianRating,
  experienceScore,
  isRanked,
  rankTutors,
  responseScore,
  scoreTutor,
  slotCovers,
  EXPLORATION_BONUS,
  RATING_PRIOR_MEAN,
  RESPONSE_PRIOR_RATE,
  TUTOR_WEIGHTS,
  type TutorCandidate,
} from "../tutor-ranking";

function tutor(id: string, o: Partial<TutorCandidate> = {}): TutorCandidate {
  return {
    id,
    subjects: ["Mathematics"],
    levelsTaught: ["HIGH_SCHOOL"],
    curriculum: "8-4-4",
    avgRating: 4,
    reviewCount: 10,
    completedSessions: 20,
    offersAccepted: 8,
    offersMade: 10,
    isOnline: true,
    activeSessions: 0,
    maxConcurrentSessions: 3,
    county: "Nairobi",
    hourlyRate: 500,
    ...o,
  };
}

const q = { subjects: ["Mathematics"], level: "HIGH_SCHOOL", curriculum: "8-4-4", county: "Nairobi" };

describe("weights", () => {
  it("sum to 1", () => {
    const sum = Object.values(TUTOR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("component helpers", () => {
  it("bayesian rating returns the prior with no reviews", () => {
    expect(bayesianRating(0, 0)).toBeCloseTo(RATING_PRIOR_MEAN);
    expect(bayesianRating(5, 0)).toBeCloseTo(RATING_PRIOR_MEAN);
  });

  it("a single 5-star review does not beat many 4.8 reviews", () => {
    expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(4.8, 50));
  });

  it("experience is log-scaled and capped", () => {
    expect(experienceScore(0)).toBe(0);
    expect(experienceScore(10)).toBeGreaterThan(experienceScore(1));
    expect(experienceScore(10) - experienceScore(1)).toBeGreaterThan(experienceScore(100) - experienceScore(91));
    expect(experienceScore(10_000)).toBe(1);
  });

  it("response rate shrinks toward the prior with little data", () => {
    expect(responseScore(0, 0)).toBeCloseTo(RESPONSE_PRIOR_RATE);
    expect(responseScore(0, 1)).toBeGreaterThan(responseScore(0, 20));
    expect(responseScore(20, 20)).toBeGreaterThan(responseScore(1, 1));
  });

  it("slotCovers judges slots in EAT wall-clock time", () => {
    // 2026-10-07 is a Wednesday. 07:30Z = 10:30 EAT.
    const at = new Date("2026-10-07T07:30:00Z");
    expect(slotCovers([{ dayOfWeek: 3, startTime: "10:00", endTime: "11:00" }], at)).toBe(true);
    expect(slotCovers([{ dayOfWeek: 3, startTime: "07:00", endTime: "08:00" }], at)).toBe(false);
    expect(slotCovers([{ dayOfWeek: 3, startTime: "10:00", endTime: "11:00", isBlocked: true }], at)).toBe(false);
    expect(slotCovers([], at)).toBe(false);
  });
});

describe("hard filters", () => {
  it("excludes tutors without the subject (case/alias-insensitive match is kept)", () => {
    expect(isRanked(scoreTutor(tutor("a", { subjects: ["Physics"] }), q))).toBe(false);
    expect(isRanked(scoreTutor(tutor("b", { subjects: ["maths"] }), q))).toBe(true);
    expect(isRanked(scoreTutor(tutor("c", { subjects: ["MATHEMATICS"] }), q))).toBe(true);
  });

  it("excludes a known level mismatch but keeps unknown levels", () => {
    expect(isRanked(scoreTutor(tutor("a", { levelsTaught: ["UNIVERSITY"] }), q))).toBe(false);
    expect(isRanked(scoreTutor(tutor("b", { levelsTaught: [] }), q))).toBe(true);
    expect(isRanked(scoreTutor(tutor("c", { levelsTaught: ["UNIVERSITY"] }), { ...q, level: null }))).toBe(true);
    expect(isRanked(scoreTutor(tutor("d", { levelsTaught: ["High School"] }), q))).toBe(true);
  });

  it("excludes tutors at capacity", () => {
    expect(isRanked(scoreTutor(tutor("a", { activeSessions: 3, maxConcurrentSessions: 3 }), q))).toBe(false);
  });

  it("excludes offline tutors only when availability now is required", () => {
    const off = tutor("a", { isOnline: false });
    expect(isRanked(scoreTutor(off, q))).toBe(true);
    expect(isRanked(scoreTutor(off, { ...q, requireAvailableNow: true }))).toBe(false);
  });

  it("honours excludeIds", () => {
    expect(rankTutors([tutor("a"), tutor("b")], { ...q, excludeIds: ["a"] }).map((t) => t.id)).toEqual(["b"]);
  });

  it("an empty subject list matches any tutor", () => {
    expect(rankTutors([tutor("a", { subjects: ["Physics"] })], { subjects: [] })).toHaveLength(1);
  });

  it("returns [] for no tutors", () => {
    expect(rankTutors([], q)).toEqual([]);
  });
});

describe("ordering", () => {
  it("prefers higher Bayesian rating", () => {
    const ids = rankTutors(
      [tutor("low", { avgRating: 3, reviewCount: 30 }), tutor("high", { avgRating: 4.9, reviewCount: 30 })],
      q,
    ).map((t) => t.id);
    expect(ids).toEqual(["high", "low"]);
  });

  it("prefers an online tutor over an offline one", () => {
    const ids = rankTutors([tutor("off", { isOnline: false }), tutor("on")], q).map((t) => t.id);
    expect(ids).toEqual(["on", "off"]);
  });

  it("prefers the less loaded tutor", () => {
    const ids = rankTutors([tutor("busy", { activeSessions: 2 }), tutor("free", { activeSessions: 0 })], q).map(
      (t) => t.id,
    );
    expect(ids).toEqual(["free", "busy"]);
  });

  it("prefers a tutor who accepts offers", () => {
    const ids = rankTutors(
      [tutor("ghost", { offersAccepted: 0, offersMade: 30 }), tutor("reliable", { offersAccepted: 30, offersMade: 30 })],
      q,
    ).map((t) => t.id);
    expect(ids).toEqual(["reliable", "ghost"]);
  });

  it("prefers a matching curriculum", () => {
    const ids = rankTutors([tutor("cbc", { curriculum: "CBC" }), tutor("844", { curriculum: "8-4-4" })], q).map(
      (t) => t.id,
    );
    expect(ids).toEqual(["844", "cbc"]);
  });

  it("uses county only as a tiebreaker", () => {
    const ids = rankTutors([tutor("mombasa", { county: "Mombasa" }), tutor("nairobi", { county: "Nairobi County" })], q).map(
      (t) => t.id,
    );
    expect(ids).toEqual(["nairobi", "mombasa"]);

    // A clearly better tutor elsewhere still wins.
    const ids2 = rankTutors(
      [tutor("near", { avgRating: 3, reviewCount: 40 }), tutor("far", { county: "Kisumu", avgRating: 5, reviewCount: 40 })],
      q,
    ).map((t) => t.id);
    expect(ids2).toEqual(["far", "near"]);
  });

  it("price: within budget beats over budget", () => {
    const ids = rankTutors([tutor("pricey", { hourlyRate: 1500 }), tutor("cheap", { hourlyRate: 400 })], {
      ...q,
      maxHourlyRate: 500,
    }).map((t) => t.id);
    expect(ids).toEqual(["cheap", "pricey"]);
  });

  it("new tutors get a bounded exploration bonus", () => {
    const fresh = scoreTutor(tutor("new", { completedSessions: 0, reviewCount: 0, avgRating: 0 }), q);
    const vet = scoreTutor(tutor("vet", { completedSessions: 50 }), q);
    if (!isRanked(fresh) || !isRanked(vet)) throw new Error("expected ranked");
    expect(fresh.explorationBonus).toBeCloseTo(EXPLORATION_BONUS);
    expect(vet.explorationBonus).toBe(0);
    // ...but it doesn't let an unknown tutor leapfrog a proven, well-rated one.
    expect(vet.score).toBeGreaterThan(fresh.score);
  });

  it("requested time: a tutor with a covering slot beats one without", () => {
    const at = new Date("2026-10-07T07:30:00Z"); // Wed 10:30 EAT
    const slots = [{ dayOfWeek: 3, startTime: "10:00", endTime: "12:00" }];
    const ids = rankTutors([tutor("noslot", { isOnline: true }), tutor("slot", { isOnline: false, slots })], {
      ...q,
      requestedAt: at,
    }).map((t) => t.id);
    expect(ids).toEqual(["slot", "noslot"]);
  });

  it("is deterministic for identical tutors (id order)", () => {
    const ids = rankTutors([tutor("b"), tutor("a"), tutor("c")], q).map((t) => t.id);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("partial subject overlap scores lower than full overlap", () => {
    const both = scoreTutor(tutor("both", { subjects: ["Mathematics", "Physics"] }), { ...q, subjects: ["Mathematics", "Physics"] });
    const one = scoreTutor(tutor("one"), { ...q, subjects: ["Mathematics", "Physics"] });
    if (!isRanked(both) || !isRanked(one)) throw new Error("expected ranked");
    expect(both.components.subject).toBe(1);
    expect(one.components.subject).toBe(0.5);
    expect(both.score).toBeGreaterThan(one.score);
  });
});
