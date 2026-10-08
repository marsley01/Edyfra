// Instant-match state machine — PURE decisions, no I/O. match-engine.ts reads
// the DB, asks these functions what to do, then performs the (conditional)
// writes. Tested in __tests__/match-flow.test.ts.
//
// Timeline of a MatchRequest, measured from createdAt:
//   0s ............ TUTOR_PHASE_MS   offer to the best-ranked online tutor; each
//                                    offer is exclusive for OFFER_TIMEOUT_MS, then
//                                    (on decline/timeout) the next tutor is offered
//   TUTOR_PHASE_MS  AI_FALLBACK_MS   pair with another student who is searching live
//   AI_FALLBACK_MS  REQUEST_TTL_MS   Mash AI fallback (student's own poll triggers it)
//   > REQUEST_TTL_MS                 expired: hidden from tutors, cannot be accepted,
//                                    swept by sweepAndAIFallback
// The UI timer (MatchProvider TOTAL_TIME = 60s) mirrors these numbers.

export const MATCH_TIMINGS = {
  OFFER_TIMEOUT_MS: 12_000,
  TUTOR_PHASE_MS: 30_000,
  AI_FALLBACK_MS: 55_000,
  REQUEST_TTL_MS: 5 * 60_000,
} as const;

export type MatchPhase = "tutor" | "peer" | "ai" | "expired";

export function matchPhase(createdAt: Date, now: Date): MatchPhase {
  const elapsed = now.getTime() - createdAt.getTime();
  if (elapsed >= MATCH_TIMINGS.REQUEST_TTL_MS) return "expired";
  if (elapsed >= MATCH_TIMINGS.AI_FALLBACK_MS) return "ai";
  if (elapsed >= MATCH_TIMINGS.TUTOR_PHASE_MS) return "peer";
  return "tutor";
}

export function isRequestExpired(createdAt: Date, now: Date): boolean {
  return matchPhase(createdAt, now) === "expired";
}

/**
 * PENDING   waiting on the tutor
 * ACCEPTED  tutor took it
 * DECLINED  tutor said no
 * EXPIRED   tutor didn't answer within OFFER_TIMEOUT_MS
 * WITHDRAWN request was resolved another way (peer/AI/cancel) — not the tutor's fault
 */
export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";

export interface OfferRow {
  id: string;
  tutorId: string;
  status: OfferStatus;
  expiresAt: Date;
}

export function isOfferActive(offer: OfferRow, now: Date): boolean {
  return offer.status === "PENDING" && offer.expiresAt.getTime() > now.getTime();
}

export type OfferDecision =
  | { kind: "wait"; offer: OfferRow; expire: string[] }
  | { kind: "offer"; tutorId: string; expire: string[] }
  | { kind: "exhausted"; expire: string[] };

/**
 * Given every offer already made for a request and the ranked candidate ids
 * (best first), decide the next step:
 *  - an unexpired PENDING offer exists  -> wait for that tutor
 *  - otherwise offer the best candidate never offered this request before
 *  - nobody left                        -> exhausted (move on to peers)
 * Stale PENDING offers are returned in `expire` so the caller can close them.
 */
export function decideNextOffer(
  offers: readonly OfferRow[],
  rankedTutorIds: readonly string[],
  now: Date,
): OfferDecision {
  const expire = offers
    .filter((o) => o.status === "PENDING" && !isOfferActive(o, now))
    .map((o) => o.id);
  const active = offers.find((o) => isOfferActive(o, now));
  if (active) return { kind: "wait", offer: active, expire };

  const alreadyOffered = new Set(offers.map((o) => o.tutorId));
  const next = rankedTutorIds.find((id) => !alreadyOffered.has(id));
  if (next) return { kind: "offer", tutorId: next, expire };
  return { kind: "exhausted", expire };
}

/**
 * Who may accept a request right now. While an offer is active only the
 * offered tutor may; otherwise any eligible tutor/peer may (first conditional
 * write wins, so there is never a double assignment).
 */
export function canAccept(
  offers: readonly OfferRow[],
  acceptorId: string,
  now: Date,
): { ok: true; offerId: string | null } | { ok: false; reason: "offered_to_other" } {
  const active = offers.find((o) => isOfferActive(o, now));
  if (!active) return { ok: true, offerId: null };
  if (active.tutorId === acceptorId) return { ok: true, offerId: active.id };
  return { ok: false, reason: "offered_to_other" };
}

/** Accept-rate stats per tutor from offer history (for the ranking's response component). */
export function offerStats(
  rows: readonly { tutorId: string; status: OfferStatus }[],
): Map<string, { made: number; accepted: number }> {
  const out = new Map<string, { made: number; accepted: number }>();
  for (const r of rows) {
    if (r.status === "PENDING" || r.status === "WITHDRAWN") continue;
    const s = out.get(r.tutorId) ?? { made: 0, accepted: 0 };
    s.made += 1;
    if (r.status === "ACCEPTED") s.accepted += 1;
    out.set(r.tutorId, s);
  }
  return out;
}
