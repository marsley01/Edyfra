/**
 * Pure helpers for the social surfaces (feed ranking, keyset cursors,
 * relative timestamps). No I/O here so it can be unit-tested and imported by
 * both server actions and client components.
 */

/* ─── "For you" ranking ─────────────────────────────────────────────────── */

export type RankCandidate = {
  id: string;
  userId: string;
  createdAt: Date;
  likes: number;
  comments: number;
  subject: string | null;
  level: string | null;
};

export type RankContext = {
  viewerId: string | null;
  followingIds: Set<string>;
  viewerLevel: string | null;
  /** Lower-cased subjects from the viewer's student/tutor profile. */
  viewerSubjects: Set<string>;
  now: number;
};

export const RANK_WEIGHTS = {
  /** Comments are worth more than likes: they're a stronger signal of a real conversation. */
  comment: 2,
  like: 1,
  /** Engagement is dampened so one viral post can't bury everything fresh. */
  engagementExponent: 0.8,
  /** Gravity: how fast posts sink with age (hours). Hacker-News style. */
  gravity: 1.4,
  ageOffsetHours: 2,
  followBoost: 1.0,
  sameLevelBoost: 0.35,
  subjectBoost: 0.25,
  /** Your own posts still appear, just not ahead of everyone else's. */
  ownPostFactor: 0.8,
  /** Each extra post by the same author in the ranked list is multiplied by this. */
  authorRepeatDecay: 0.7,
} as const;

/**
 * score = affinity × (1 + likes + 2·comments)^0.8 / (ageHours + 2)^1.4
 * affinity = 1 + 1.0·followsAuthor + 0.35·sameLevel + 0.25·subjectMatch   (×0.8 for own posts)
 */
export function scorePost(p: RankCandidate, ctx: RankContext): number {
  const W = RANK_WEIGHTS;
  const engagement = Math.max(0, p.likes) * W.like + Math.max(0, p.comments) * W.comment;
  const ageHours = Math.max(0, (ctx.now - p.createdAt.getTime()) / 3_600_000);

  let affinity = 1;
  if (ctx.followingIds.has(p.userId)) affinity += W.followBoost;
  if (ctx.viewerLevel && p.level && ctx.viewerLevel === p.level) affinity += W.sameLevelBoost;
  if (p.subject && ctx.viewerSubjects.has(p.subject.toLowerCase())) affinity += W.subjectBoost;
  if (ctx.viewerId && p.userId === ctx.viewerId) affinity *= W.ownPostFactor;

  return (affinity * Math.pow(1 + engagement, W.engagementExponent)) / Math.pow(ageHours + W.ageOffsetHours, W.gravity);
}

/**
 * Ranks candidates by score, then applies an author-diversity pass so a
 * single prolific poster can't fill a whole page: the k-th post (0-based) by
 * the same author is multiplied by 0.7^k. Ties break newest-first, then id,
 * so the order is deterministic between page requests.
 */
export function rankForYou<T extends RankCandidate>(candidates: T[], ctx: RankContext): T[] {
  const scored = candidates.map((c) => ({ c, s: scorePost(c, ctx) }));
  scored.sort(byScoreThenRecency);
  const seen = new Map<string, number>();
  const diversified = scored.map(({ c, s }) => {
    const k = seen.get(c.userId) ?? 0;
    seen.set(c.userId, k + 1);
    return { c, s: s * Math.pow(RANK_WEIGHTS.authorRepeatDecay, k) };
  });
  diversified.sort(byScoreThenRecency);
  return diversified.map((x) => x.c);
}

function byScoreThenRecency(a: { c: RankCandidate; s: number }, b: { c: RankCandidate; s: number }) {
  if (b.s !== a.s) return b.s - a.s;
  const t = b.c.createdAt.getTime() - a.c.createdAt.getTime();
  if (t !== 0) return t;
  return a.c.id < b.c.id ? 1 : a.c.id > b.c.id ? -1 : 0;
}

/* ─── Cursors ───────────────────────────────────────────────────────────── */
/*
 * Keyset cursors (instead of Prisma's `cursor: { id }`) so a page still
 * resolves if the row the cursor points at was deleted in the meantime.
 *   t:<createdAtMs>:<id>             chronological (latest / following / profile)
 *   p:<likes>:<createdAtMs>:<id>     popular (likes desc, then newest)
 *   r:<offset>:<asOfMs>              for-you ranked window
 */

export type FeedCursor =
  | { kind: "time"; createdAt: Date; id: string }
  | { kind: "popular"; likes: number; createdAt: Date; id: string }
  | { kind: "ranked"; offset: number; asOf: number };

export function encodeCursor(c: FeedCursor): string {
  switch (c.kind) {
    case "time":
      return `t:${c.createdAt.getTime()}:${c.id}`;
    case "popular":
      return `p:${c.likes}:${c.createdAt.getTime()}:${c.id}`;
    case "ranked":
      return `r:${c.offset}:${c.asOf}`;
  }
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function decodeCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw || typeof raw !== "string" || raw.length > 120) return null;
  const parts = raw.split(":");
  const num = (s: string | undefined) => (s && /^\d{1,15}$/.test(s) ? Number(s) : NaN);
  if (parts[0] === "t" && parts.length === 3) {
    const ms = num(parts[1]);
    if (!Number.isFinite(ms) || !ID_RE.test(parts[2])) return null;
    return { kind: "time", createdAt: new Date(ms), id: parts[2] };
  }
  if (parts[0] === "p" && parts.length === 4) {
    const likes = num(parts[1]);
    const ms = num(parts[2]);
    if (!Number.isFinite(likes) || !Number.isFinite(ms) || !ID_RE.test(parts[3])) return null;
    return { kind: "popular", likes, createdAt: new Date(ms), id: parts[3] };
  }
  if (parts[0] === "r" && parts.length === 3) {
    const offset = num(parts[1]);
    const asOf = num(parts[2]);
    if (!Number.isFinite(offset) || !Number.isFinite(asOf) || offset > 10_000) return null;
    return { kind: "ranked", offset, asOf };
  }
  return null;
}

/* ─── Relative time ─────────────────────────────────────────────────────── */

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
const DATE_FMT_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

/** Deterministic absolute date (same output on server and client). */
export function formatAbsoluteDate(iso: string | Date, now?: number): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = now !== undefined && new Date(now).getUTCFullYear() === d.getUTCFullYear();
  return (sameYear ? DATE_FMT : DATE_FMT_YEAR).format(d);
}

/** "now", "5m", "3h", "2d", then an absolute date after a week. */
export function formatRelative(iso: string | Date, now: number): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return formatAbsoluteDate(d, now);
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${trim1(n / 1_000_000)}M`;
  if (n >= 10_000) return `${Math.floor(n / 1_000)}K`;
  if (n >= 1_000) return `${trim1(n / 1_000)}K`;
  return String(Math.floor(n));
}

function trim1(x: number) {
  return (Math.floor(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
}
