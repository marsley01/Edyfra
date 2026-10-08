// Tutor matching — a PURE scoring function (no DB, no clock reads unless a
// `now` is passed in). Used by instant matching (match-engine.ts) and by the
// tutor directory (actions/search.ts). Tested in __tests__/tutor-ranking.test.ts.
//
// score = Σ weight_i · component_i  (+ exploration bonus), each component in [0,1]
//
//   subject       overlap of requested subject(s) with tutor subjects (REQUIRED, 0 => excluded)
//   level         tutor levelsTaught contains student level (unknown => 0.5; known mismatch => excluded)
//   curriculum    same curriculum 1, unknown 0.5, different 0
//   rating        Bayesian average: (C·m + n·avg) / (C + n), mapped 1..5 -> 0..1
//   experience    log(1 + completed) / log(1 + EXPERIENCE_SATURATION), capped at 1
//   response      acceptance/response rate shrunk toward a prior: (K·p0 + n·rate) / (K + n)
//   availability  instant: online => 1 (offline excluded when requireAvailableNow)
//                 scheduled: a recurring slot covers requestedAt => 1, else 0
//   load          1 - active/capacity (at/over capacity => excluded)
//   price         within budget 1, over budget decays linearly to 0 at 2x budget; no budget 0.5
//   exploration   + EXPLORATION_BONUS · (1 - completed/NEW_TUTOR_SESSIONS) for new tutors
//
// Ordering: score (rounded to 2dp) desc -> same county first -> fewer active
// sessions -> least recently assigned -> id.

import { countyKey, curriculumKey, levelKey, subjectKey, subjectKeySet } from "./normalize";

export const TUTOR_WEIGHTS = {
  subject: 0.2,
  level: 0.15,
  curriculum: 0.05,
  rating: 0.2,
  experience: 0.1,
  response: 0.1,
  availability: 0.1,
  load: 0.05,
  price: 0.05,
} as const;

/** Prior mean rating every tutor starts from (m). */
export const RATING_PRIOR_MEAN = 3.8;
/** How many "virtual reviews" the prior is worth (C). */
export const RATING_PRIOR_WEIGHT = 5;
/** Completed sessions at which the experience component saturates. */
export const EXPERIENCE_SATURATION = 100;
/** Prior acceptance rate (p0) and its weight in virtual offers (K). */
export const RESPONSE_PRIOR_RATE = 0.8;
export const RESPONSE_PRIOR_WEIGHT = 5;
/** Tutors with fewer completed sessions than this get an exploration bonus. */
export const NEW_TUTOR_SESSIONS = 5;
export const EXPLORATION_BONUS = 0.04;

export interface TutorSlot {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isBlocked?: boolean;
}

export interface TutorCandidate {
  id: string;
  subjects: readonly string[];
  levelsTaught: readonly string[];
  curriculum?: string | null;
  /** Average review score 1..5 (0/undefined when no reviews). */
  avgRating?: number | null;
  reviewCount?: number | null;
  completedSessions?: number | null;
  /** Offers accepted / offers made, when we have offer history. */
  offersAccepted?: number | null;
  offersMade?: number | null;
  isOnline?: boolean;
  slots?: readonly TutorSlot[] | null;
  activeSessions?: number | null;
  maxConcurrentSessions?: number | null;
  county?: string | null;
  hourlyRate?: number | null;
  lastAssignedAt?: Date | null;
}

export interface TutorMatchQuery {
  /** Subjects the student wants help with; at least one must overlap. Empty = any. */
  subjects: readonly string[];
  level?: string | null;
  curriculum?: string | null;
  county?: string | null;
  /** Budget per hour in KSh; omitted/0 = no price preference. */
  maxHourlyRate?: number | null;
  /** When set, availability is judged against recurring slots at this time. */
  requestedAt?: Date | null;
  /** Instant matching: exclude tutors who aren't online right now. */
  requireAvailableNow?: boolean;
  /** Tutors to skip (already offered / declined this request, the student). */
  excludeIds?: readonly string[];
}

export type TutorComponent = keyof typeof TUTOR_WEIGHTS;

export interface RankedTutor {
  id: string;
  score: number;
  components: Record<TutorComponent, number>;
  explorationBonus: number;
  sameCounty: boolean;
  reasons: string[];
}

export type ExclusionReason = "excluded" | "no_subject" | "level_mismatch" | "offline" | "at_capacity";

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

export function bayesianRating(avg: number | null | undefined, count: number | null | undefined): number {
  const n = Math.max(0, count ?? 0);
  const a = n > 0 && avg && avg > 0 ? avg : 0;
  return (RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN + n * a) / (RATING_PRIOR_WEIGHT + n);
}

export function experienceScore(completed: number | null | undefined): number {
  const c = Math.max(0, completed ?? 0);
  return clamp01(Math.log1p(c) / Math.log1p(EXPERIENCE_SATURATION));
}

export function responseScore(accepted: number | null | undefined, made: number | null | undefined): number {
  const n = Math.max(0, made ?? 0);
  const k = Math.max(0, Math.min(n, accepted ?? 0));
  return (RESPONSE_PRIOR_WEIGHT * RESPONSE_PRIOR_RATE + k) / (RESPONSE_PRIOR_WEIGHT + n);
}

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Tutor slots are stored as Kenyan wall-clock times (EAT, UTC+3, no DST). */
export const SLOT_UTC_OFFSET_MINUTES = 180;

/** True when a recurring, unblocked slot covers `at` (judged in EAT wall-clock time). */
export function slotCovers(
  slots: readonly TutorSlot[] | null | undefined,
  at: Date,
  utcOffsetMinutes: number = SLOT_UTC_OFFSET_MINUTES,
): boolean {
  if (!slots?.length) return false;
  const local = new Date(at.getTime() + utcOffsetMinutes * 60_000);
  const day = local.getUTCDay();
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  return slots.some((s) => {
    if (s.isBlocked || s.dayOfWeek !== day) return false;
    const start = minutesOf(s.startTime);
    const end = minutesOf(s.endTime);
    return start !== null && end !== null && mins >= start && mins < end;
  });
}

function levelFit(tutor: TutorCandidate, studentLevel: string | null | undefined): number | "mismatch" {
  const want = levelKey(studentLevel);
  const taught = new Set(tutor.levelsTaught.map((l) => levelKey(l)).filter(Boolean));
  if (!want || taught.size === 0) return 0.5;
  return taught.has(want) ? 1 : "mismatch";
}

export function scoreTutor(
  tutor: TutorCandidate,
  q: TutorMatchQuery,
): RankedTutor | { id: string; excluded: ExclusionReason } {
  if (q.excludeIds?.includes(tutor.id)) return { id: tutor.id, excluded: "excluded" };

  // Subject (required)
  const tutorSubjects = subjectKeySet(tutor.subjects);
  const wanted = Array.from(subjectKeySet(q.subjects));
  let subject = 1;
  if (wanted.length > 0) {
    const overlap = wanted.filter((s) => tutorSubjects.has(s)).length;
    if (overlap === 0) return { id: tutor.id, excluded: "no_subject" };
    subject = overlap / wanted.length;
  }

  // Level
  const lf = levelFit(tutor, q.level);
  if (lf === "mismatch") return { id: tutor.id, excluded: "level_mismatch" };

  // Capacity / load
  const max = Math.max(0, tutor.maxConcurrentSessions ?? 3);
  const active = Math.max(0, tutor.activeSessions ?? 0);
  if (max > 0 && active >= max) return { id: tutor.id, excluded: "at_capacity" };
  const load = max > 0 ? clamp01(1 - active / max) : 0;

  // Availability
  let availability: number;
  if (q.requestedAt) {
    availability = slotCovers(tutor.slots, q.requestedAt) ? 1 : 0;
  } else {
    availability = tutor.isOnline ? 1 : 0;
    if (q.requireAvailableNow && !tutor.isOnline) return { id: tutor.id, excluded: "offline" };
  }

  // Curriculum
  const sc = curriculumKey(q.curriculum);
  const tc = curriculumKey(tutor.curriculum);
  const curriculum = !sc || !tc ? 0.5 : sc === tc ? 1 : 0;

  // Rating (Bayesian average, 1..5 -> 0..1)
  const bayes = bayesianRating(tutor.avgRating, tutor.reviewCount);
  const rating = clamp01((bayes - 1) / 4);

  const completed = Math.max(0, tutor.completedSessions ?? 0);
  const experience = experienceScore(completed);
  const response = clamp01(responseScore(tutor.offersAccepted, tutor.offersMade));

  // Price
  const budget = q.maxHourlyRate ?? 0;
  const rate = tutor.hourlyRate ?? 0;
  let price = 0.5;
  if (budget > 0) {
    price = rate <= budget ? 1 : clamp01(1 - (rate - budget) / budget);
  }

  const components: Record<TutorComponent, number> = {
    subject,
    level: lf,
    curriculum,
    rating,
    experience,
    response,
    availability,
    load,
    price,
  };

  let score = 0;
  for (const key of Object.keys(TUTOR_WEIGHTS) as TutorComponent[]) {
    score += TUTOR_WEIGHTS[key] * components[key];
  }
  const explorationBonus =
    completed < NEW_TUTOR_SESSIONS ? EXPLORATION_BONUS * (1 - completed / NEW_TUTOR_SESSIONS) : 0;
  score += explorationBonus;

  const sameCounty = !!q.county && !!tutor.county && countyKey(q.county) === countyKey(tutor.county);

  const reasons: string[] = [];
  if (wanted.length > 0) reasons.push("Teaches your subject");
  if (lf === 1) reasons.push("Teaches your level");
  if (curriculum === 1) reasons.push("Same curriculum");
  if (tutor.isOnline) reasons.push("Online now");
  if (sameCounty) reasons.push("Same county");
  if (completed < NEW_TUTOR_SESSIONS) reasons.push("New tutor");

  return { id: tutor.id, score, components, explorationBonus, sameCounty, reasons };
}

export function isRanked(r: RankedTutor | { id: string; excluded: ExclusionReason }): r is RankedTutor {
  return !("excluded" in r);
}

/** Rank tutors best-first. Excluded tutors are dropped. Deterministic. */
export function rankTutors(tutors: readonly TutorCandidate[], q: TutorMatchQuery): RankedTutor[] {
  const byId = new Map(tutors.map((t) => [t.id, t]));
  const ranked = tutors.map((t) => scoreTutor(t, q)).filter(isRanked);
  return ranked.sort((a, b) => {
    const sa = Math.round(a.score * 100);
    const sb = Math.round(b.score * 100);
    if (sa !== sb) return sb - sa;
    if (a.sameCounty !== b.sameCounty) return a.sameCounty ? -1 : 1;
    const ta = byId.get(a.id)!;
    const tb = byId.get(b.id)!;
    const la = ta.activeSessions ?? 0;
    const lb = tb.activeSessions ?? 0;
    if (la !== lb) return la - lb;
    const aa = ta.lastAssignedAt?.getTime() ?? 0;
    const ab = tb.lastAssignedAt?.getTime() ?? 0;
    if (aa !== ab) return aa - ab;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Convenience for callers that only need to know if a subject is taught. */
export function teachesSubject(tutorSubjects: readonly string[], subject: string): boolean {
  return subjectKeySet(tutorSubjects).has(subjectKey(subject));
}
