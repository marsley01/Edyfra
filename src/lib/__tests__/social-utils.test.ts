import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  formatCount,
  formatRelative,
  formatAbsoluteDate,
  rankForYou,
  scorePost,
  type RankCandidate,
  type RankContext,
} from "@/lib/social-utils";

const NOW = Date.UTC(2026, 9, 8, 12, 0, 0);
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000);

function post(over: Partial<RankCandidate> & { id: string }): RankCandidate {
  return {
    userId: "u-other",
    createdAt: hoursAgo(1),
    likes: 0,
    comments: 0,
    subject: null,
    level: null,
    ...over,
  };
}

const ctx = (over: Partial<RankContext> = {}): RankContext => ({
  viewerId: "me",
  followingIds: new Set(),
  viewerLevel: null,
  viewerSubjects: new Set(),
  now: NOW,
  ...over,
});

describe("scorePost", () => {
  it("decays with age", () => {
    expect(scorePost(post({ id: "a", createdAt: hoursAgo(1) }), ctx())).toBeGreaterThan(
      scorePost(post({ id: "b", createdAt: hoursAgo(30) }), ctx()),
    );
  });

  it("values a comment more than a like", () => {
    const liked = scorePost(post({ id: "a", likes: 1 }), ctx());
    const commented = scorePost(post({ id: "b", comments: 1 }), ctx());
    expect(commented).toBeGreaterThan(liked);
  });

  it("boosts followed authors, same level and matching subjects", () => {
    const base = scorePost(post({ id: "a", userId: "x" }), ctx());
    expect(scorePost(post({ id: "a", userId: "x" }), ctx({ followingIds: new Set(["x"]) }))).toBeCloseTo(base * 2);
    expect(scorePost(post({ id: "a", level: "UNIVERSITY" }), ctx({ viewerLevel: "UNIVERSITY" }))).toBeCloseTo(base * 1.35);
    expect(
      scorePost(post({ id: "a", subject: "Physics" }), ctx({ viewerSubjects: new Set(["physics"]) })),
    ).toBeCloseTo(base * 1.25);
  });

  it("matches the documented formula", () => {
    // affinity 1, engagement 3 likes + 2×1 comment = 5, age 2h
    const s = scorePost(post({ id: "a", likes: 3, comments: 1, createdAt: hoursAgo(2) }), ctx());
    expect(s).toBeCloseTo(Math.pow(6, 0.8) / Math.pow(4, 1.4), 10);
  });

  it("dampens own posts", () => {
    const other = scorePost(post({ id: "a", userId: "x" }), ctx());
    const mine = scorePost(post({ id: "a", userId: "me" }), ctx());
    expect(mine).toBeCloseTo(other * 0.8);
  });
});

describe("rankForYou", () => {
  it("lets a fresh post from someone you follow beat an older popular one", () => {
    const ranked = rankForYou(
      [
        post({ id: "old-popular", likes: 10, createdAt: hoursAgo(48) }),
        post({ id: "fresh-friend", userId: "friend", createdAt: hoursAgo(1) }),
      ],
      ctx({ followingIds: new Set(["friend"]) }),
    );
    expect(ranked.map((p) => p.id)).toEqual(["fresh-friend", "old-popular"]);
  });

  it("spreads out a prolific author", () => {
    const spam = [0, 1, 2, 3].map((i) => post({ id: `s${i}`, userId: "spammer", createdAt: hoursAgo(1 + i * 0.01) }));
    const other = post({ id: "o", userId: "other", createdAt: hoursAgo(1.5) });
    const ranked = rankForYou([...spam, other], ctx()).map((p) => p.id);
    expect(ranked[0]).toBe("s0");
    expect(ranked.indexOf("o")).toBeLessThan(3);
  });

  it("is deterministic for ties", () => {
    const a = post({ id: "a" });
    const b = post({ id: "b", userId: "u2" });
    expect(rankForYou([a, b], ctx()).map((p) => p.id)).toEqual(rankForYou([b, a], ctx()).map((p) => p.id));
  });
});

describe("cursors", () => {
  it("round-trips every kind", () => {
    const d = new Date(NOW);
    for (const c of [
      { kind: "time" as const, createdAt: d, id: "ckabc123" },
      { kind: "popular" as const, likes: 7, createdAt: d, id: "ck_x-1" },
      { kind: "ranked" as const, offset: 24, asOf: NOW },
      { kind: "ranked" as const, offset: 12, asOf: NOW, lastId: "ckpost42" },
    ]) {
      expect(decodeCursor(encodeCursor(c))).toEqual(c);
    }
  });

  it("rejects garbage instead of throwing", () => {
    for (const bad of [null, undefined, "", "x", "t:abc:id", "t:1:bad id", "p:1:2", "r:-1:2", "r:99999:1", "t:1:a:b", "r:1:2:bad id", "r:1:2:a:b", "a".repeat(200)]) {
      expect(decodeCursor(bad as string)).toBeNull();
    }
  });
});

describe("time + counts", () => {
  it("formats relative times", () => {
    expect(formatRelative(new Date(NOW - 10_000), NOW)).toBe("now");
    expect(formatRelative(new Date(NOW - 5 * 60_000), NOW)).toBe("5m");
    expect(formatRelative(hoursAgo(3), NOW)).toBe("3h");
    expect(formatRelative(hoursAgo(50), NOW)).toBe("2d");
    expect(formatRelative(hoursAgo(24 * 10), NOW)).toBe(formatAbsoluteDate(hoursAgo(24 * 10), NOW));
    expect(formatRelative("not a date", NOW)).toBe("");
  });

  it("formats absolute dates in Nairobi time deterministically", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Nairobi (UTC+3).
    expect(formatAbsoluteDate(new Date(Date.UTC(2025, 11, 31, 23, 30)))).toBe("1 Jan 2026");
  });

  it("abbreviates counts", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1000)).toBe("1K");
    expect(formatCount(1250)).toBe("1.2K");
    expect(formatCount(15_400)).toBe("15K");
    expect(formatCount(2_500_000)).toBe("2.5M");
    expect(formatCount(-3)).toBe("0");
  });
});
