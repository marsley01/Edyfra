// Student discovery — PURE scoring for "study buddies" and for tutors looking
// for students. Used by match-engine.ts (live peer pairing) and
// actions/search.ts (suggestions). Tested in __tests__/student-discovery.test.ts.
//
// score = 0.40·subjects + 0.25·level + 0.15·county + 0.20·recency
//
//   subjects  |shared| / |viewer subjects|   (0 shared => excluded unless the
//             viewer has no subjects; a required `subject` must be shared)
//   level     0.5 same EduLevel + 0.5 same form/grade; known different EduLevel => 0
//             (unknown on either side => 0.5 for that half)
//   county    same county 1, else 0
//   recency   2^(-hoursSinceActive / RECENCY_HALF_LIFE_HOURS); never active => 0
//
// Ordering: score desc -> more shared subjects -> more recently active -> id.

import { countyKey, formKey, levelKey, subjectKey, subjectKeySet } from "./normalize";

export const PEER_WEIGHTS = {
  subjects: 0.4,
  level: 0.25,
  county: 0.15,
  recency: 0.2,
} as const;

export const RECENCY_HALF_LIFE_HOURS = 72;

export interface StudentLike {
  id: string;
  subjects: readonly string[];
  educationLevel?: string | null;
  /** "Form 3", "Grade 10", or a number (User.formYear). */
  form?: string | number | null;
  county?: string | null;
  lastActiveAt?: Date | null;
}

export interface RankedPeer {
  id: string;
  score: number;
  sharedSubjects: string[];
  components: { subjects: number; level: number; county: number; recency: number };
}

export function recencyScore(lastActiveAt: Date | null | undefined, now: Date): number {
  if (!lastActiveAt) return 0;
  const hours = Math.max(0, (now.getTime() - lastActiveAt.getTime()) / 3_600_000);
  return Math.pow(2, -hours / RECENCY_HALF_LIFE_HOURS);
}

export function scorePeer(
  viewer: StudentLike,
  candidate: StudentLike,
  now: Date,
  opts: { requiredSubject?: string | null } = {},
): RankedPeer | null {
  if (candidate.id === viewer.id) return null;

  const mine = subjectKeySet(viewer.subjects);
  const theirs = subjectKeySet(candidate.subjects);
  if (opts.requiredSubject) {
    const req = subjectKey(opts.requiredSubject);
    if (req) {
      if (!theirs.has(req)) return null;
      mine.add(req);
    }
  }

  const shared = Array.from(mine).filter((s) => theirs.has(s));
  let subjects: number;
  if (mine.size === 0) {
    subjects = 0;
  } else {
    if (shared.length === 0) return null;
    subjects = shared.length / mine.size;
  }

  const vl = levelKey(viewer.educationLevel);
  const cl = levelKey(candidate.educationLevel);
  let level: number;
  if (vl && cl && vl !== cl) {
    level = 0;
  } else {
    const eduHalf = vl && cl ? 0.5 : 0.25;
    const vf = formKey(viewer.form);
    const cf = formKey(candidate.form);
    const formHalf = vf && cf ? (vf === cf ? 0.5 : 0) : 0.25;
    level = eduHalf + formHalf;
  }

  const county =
    viewer.county && candidate.county && countyKey(viewer.county) === countyKey(candidate.county) ? 1 : 0;
  const recency = recencyScore(candidate.lastActiveAt, now);

  const score =
    PEER_WEIGHTS.subjects * subjects +
    PEER_WEIGHTS.level * level +
    PEER_WEIGHTS.county * county +
    PEER_WEIGHTS.recency * recency;

  return { id: candidate.id, score, sharedSubjects: shared, components: { subjects, level, county, recency } };
}

export function rankPeers(
  viewer: StudentLike,
  candidates: readonly StudentLike[],
  now: Date,
  opts: { requiredSubject?: string | null } = {},
): RankedPeer[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  return candidates
    .map((c) => scorePeer(viewer, c, now, opts))
    .filter((p): p is RankedPeer => p !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.sharedSubjects.length !== a.sharedSubjects.length) {
        return b.sharedSubjects.length - a.sharedSubjects.length;
      }
      const ta = byId.get(a.id)?.lastActiveAt?.getTime() ?? 0;
      const tb = byId.get(b.id)?.lastActiveAt?.getTime() ?? 0;
      if (ta !== tb) return tb - ta;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
