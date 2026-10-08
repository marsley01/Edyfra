// Pure ranking for the people search (students + tutors).
//
// Ordering contract: any EXACT field match beats any PREFIX match, which beats
// any CONTAINS match. Inside a strength tier, the field that matched decides
// (name/username before subject before school/level/county), then the
// caller-supplied boost (online, rating...), then id for a stable order so
// cursor pagination never repeats or skips a row.

import { normalizeText } from "./normalize";

export const MATCH_EXACT = 3;
export const MATCH_PREFIX = 2;
export const MATCH_CONTAINS = 1;
export const MATCH_NONE = 0;
export type MatchStrength = 0 | 1 | 2 | 3;

export const SEARCH_FIELD_WEIGHTS = {
  name: 10,
  username: 10,
  subject: 8,
  school: 6,
  level: 5,
  county: 5,
} as const;
export type SearchField = keyof typeof SEARCH_FIELD_WEIGHTS;

/** Score span reserved per strength tier; field weight + boost must stay below it. */
const TIER_SPAN = 100;
/** Max contribution of the caller boost (0..1 scaled). */
const BOOST_SPAN = 5;

export interface SearchableFields {
  id: string;
  name?: string | null;
  username?: string | null;
  subjects?: readonly string[] | null;
  school?: string | null;
  /** Free-text level labels, e.g. ["High School", "Form 3"]. */
  levels?: readonly (string | null | undefined)[] | null;
  county?: string | null;
}

export function fieldMatch(value: string | null | undefined, query: string): MatchStrength {
  const v = normalizeText(value);
  const q = normalizeText(query);
  if (!v || !q) return MATCH_NONE;
  if (v === q) return MATCH_EXACT;
  if (v.startsWith(q)) return MATCH_PREFIX;
  // Word prefix: "kam" matches "Jane Kamau".
  if (v.split(" ").some((w) => w.startsWith(q))) return MATCH_PREFIX;
  if (v.includes(q)) return MATCH_CONTAINS;
  return MATCH_NONE;
}

interface FieldHit {
  strength: MatchStrength;
  field: SearchField | null;
}

function bestHit(c: SearchableFields, q: string): FieldHit {
  let best: FieldHit = { strength: MATCH_NONE, field: null };
  const consider = (field: SearchField, value: string | null | undefined) => {
    const s = fieldMatch(value, q);
    if (
      s > best.strength ||
      (s === best.strength && s > 0 && best.field && SEARCH_FIELD_WEIGHTS[field] > SEARCH_FIELD_WEIGHTS[best.field])
    ) {
      best = { strength: s, field };
    }
  };
  consider("name", c.name);
  consider("username", c.username);
  for (const s of c.subjects ?? []) consider("subject", s);
  consider("school", c.school);
  for (const l of c.levels ?? []) consider("level", l);
  consider("county", c.county);
  return best;
}

export interface SearchScore {
  score: number;
  strength: MatchStrength;
  matchedOn: SearchField | null;
}

/**
 * Score a candidate for a query. Returns null when it doesn't match.
 * Multi-word queries match if the whole phrase matches one field, or if every
 * word matches some field ("jane physics"); the weakest word sets the tier.
 * `boost` (0..1) only reorders within a tier.
 */
export function scoreSearchCandidate(
  c: SearchableFields,
  query: string,
  boost = 0,
): SearchScore | null {
  const q = normalizeText(query);
  const b = Math.max(0, Math.min(1, boost)) * BOOST_SPAN;
  if (!q) return { score: b, strength: MATCH_NONE, matchedOn: null };

  let hit = bestHit(c, q);
  if (hit.strength === MATCH_NONE) {
    const words = q.split(" ").filter(Boolean);
    if (words.length < 2) return null;
    const hits = words.map((w) => bestHit(c, w));
    if (hits.some((h) => h.strength === MATCH_NONE)) return null;
    hit = hits.reduce((min, h) => (h.strength < min.strength ? h : min));
  }
  const fieldWeight = hit.field ? SEARCH_FIELD_WEIGHTS[hit.field] : 0;
  return {
    score: hit.strength * TIER_SPAN + fieldWeight * 5 + b,
    strength: hit.strength,
    matchedOn: hit.field,
  };
}

export function compareRanked<T extends { id: string; score: number }>(a: T, b: T): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ─── Cursor pagination ───────────────────────────────────────────────────────
// The cursor is the offset into the ranked list plus a fingerprint of the query
// + filters. A cursor from a different query is rejected (treated as page 1)
// instead of returning a confusing slice.

export function queryFingerprint(parts: unknown): string {
  const s = JSON.stringify(parts ?? null);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function encodeCursor(offset: number, fingerprint: string): string {
  return `${Math.max(0, Math.floor(offset)).toString(36)}.${fingerprint}`;
}

export function decodeCursor(cursor: string | null | undefined, fingerprint: string): number {
  if (!cursor || typeof cursor !== "string") return 0;
  const [raw, fp] = cursor.split(".");
  if (fp !== fingerprint) return 0;
  const n = parseInt(raw, 36);
  return Number.isFinite(n) && n >= 0 && n < 10_000 ? n : 0;
}

export function paginate<T>(
  ranked: readonly T[],
  cursor: string | null | undefined,
  limit: number,
  fingerprint: string,
): { items: T[]; nextCursor: string | null } {
  const offset = decodeCursor(cursor, fingerprint);
  const size = Math.max(1, Math.min(50, Math.floor(limit) || 20));
  const items = ranked.slice(offset, offset + size);
  const next = offset + size;
  return { items, nextCursor: next < ranked.length ? encodeCursor(next, fingerprint) : null };
}
