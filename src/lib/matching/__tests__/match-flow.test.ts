import { describe, expect, it } from "vitest";
import {
  canAccept,
  decideNextOffer,
  matchPhase,
  offerStats,
  MATCH_TIMINGS,
  type OfferRow,
} from "../match-flow";

const t0 = new Date("2026-10-08T12:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

function offer(id: string, tutorId: string, status: OfferRow["status"], expiresInMs: number, now = t0): OfferRow {
  return { id, tutorId, status, expiresAt: new Date(now.getTime() + expiresInMs) };
}

describe("matchPhase", () => {
  it("walks tutor -> peer -> ai -> expired", () => {
    expect(matchPhase(t0, at(0))).toBe("tutor");
    expect(matchPhase(t0, at(MATCH_TIMINGS.TUTOR_PHASE_MS - 1))).toBe("tutor");
    expect(matchPhase(t0, at(MATCH_TIMINGS.TUTOR_PHASE_MS))).toBe("peer");
    expect(matchPhase(t0, at(MATCH_TIMINGS.AI_FALLBACK_MS))).toBe("ai");
    expect(matchPhase(t0, at(MATCH_TIMINGS.REQUEST_TTL_MS))).toBe("expired");
  });
});

describe("decideNextOffer", () => {
  it("offers the best candidate first", () => {
    expect(decideNextOffer([], ["a", "b"], t0)).toEqual({ kind: "offer", tutorId: "a", expire: [] });
  });

  it("waits while an offer is active", () => {
    const d = decideNextOffer([offer("o1", "a", "PENDING", 5_000)], ["a", "b"], t0);
    expect(d.kind).toBe("wait");
  });

  it("moves to the next tutor after a decline", () => {
    const d = decideNextOffer([offer("o1", "a", "DECLINED", 5_000)], ["a", "b"], t0);
    expect(d).toEqual({ kind: "offer", tutorId: "b", expire: [] });
  });

  it("expires a timed-out pending offer and moves on", () => {
    const d = decideNextOffer([offer("o1", "a", "PENDING", -1)], ["a", "b"], t0);
    expect(d).toEqual({ kind: "offer", tutorId: "b", expire: ["o1"] });
  });

  it("never re-offers a tutor, even if they rank first again", () => {
    const d = decideNextOffer([offer("o1", "a", "EXPIRED", -1), offer("o2", "b", "DECLINED", -1)], ["b", "a"], t0);
    expect(d.kind).toBe("exhausted");
  });

  it("is exhausted with no candidates", () => {
    expect(decideNextOffer([], [], t0).kind).toBe("exhausted");
  });
});

describe("canAccept", () => {
  it("anyone may accept when no offer is active", () => {
    expect(canAccept([], "x", t0)).toEqual({ ok: true, offerId: null });
    expect(canAccept([offer("o1", "a", "PENDING", -1)], "x", t0)).toEqual({ ok: true, offerId: null });
  });

  it("only the offered tutor may accept during an active offer", () => {
    const offers = [offer("o1", "a", "PENDING", 5_000)];
    expect(canAccept(offers, "a", t0)).toEqual({ ok: true, offerId: "o1" });
    expect(canAccept(offers, "b", t0)).toEqual({ ok: false, reason: "offered_to_other" });
  });
});

describe("offerStats", () => {
  it("counts answered offers, ignoring pending and withdrawn", () => {
    const s = offerStats([
      { tutorId: "a", status: "ACCEPTED" },
      { tutorId: "a", status: "DECLINED" },
      { tutorId: "a", status: "EXPIRED" },
      { tutorId: "a", status: "PENDING" },
      { tutorId: "a", status: "WITHDRAWN" },
    ]);
    expect(s.get("a")).toEqual({ made: 3, accepted: 1 });
  });
});
