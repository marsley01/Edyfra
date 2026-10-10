"use server";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

/* Public (signed-out) community snapshot for the /community landing page.
   Aggregates are computed in the database over the last 30 days, cached for
   two minutes, and only public author fields are returned. Banned accounts
   are excluded everywhere. Each section degrades on its own: one failing
   query empties that section, never the whole page. */

export type PublicCommunityPost = {
  id: string;
  content: string;
  subject: string | null;
  likes: number;
  comments: number;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; role: string };
};

export type PublicCommunitySnapshot = {
  posts: PublicCommunityPost[];
  /** Top subjects of the last 30 days; `posts` is the 30-day post count. */
  subjects: Array<{ subject: string; posts: number }>;
  /** Most recent posts per top subject (same 30-day window as the counts). */
  postsBySubject: Record<string, PublicCommunityPost[]>;
  contributors: Array<{ id: string; name: string; avatar: string | null; role: string; posts: number }>;
  totals: { posts30d: number; members30d: number };
};

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_POSTS = 20;
const SUBJECT_POSTS = 10;
const TOP_SUBJECTS = 8;

const postSelect = {
  id: true,
  content: true,
  subject: true,
  likes: true,
  createdAt: true,
  user: { select: { id: true, name: true, avatar: true, role: true } },
  _count: { select: { comments: { where: { user: { banned: false } } } } },
} as const;

type Row = {
  id: string;
  content: string;
  subject: string | null;
  likes: number;
  createdAt: Date;
  user: { id: string; name: string; avatar: string | null; role: unknown };
  _count: { comments: number };
};

function toPublicPost(p: Row): PublicCommunityPost {
  return {
    id: p.id,
    content: p.content.length > 280 ? `${p.content.slice(0, 280)}…` : p.content,
    subject: p.subject,
    likes: p.likes,
    comments: p._count.comments,
    createdAt: p.createdAt.toISOString(),
    author: { id: p.user.id, name: p.user.name, avatar: p.user.avatar, role: String(p.user.role) },
  };
}

/** Runs one section; on failure logs and returns the fallback instead of failing the snapshot. */
async function section<T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`getPublicCommunitySnapshot: "${name}" failed:`, error);
    return fallback;
  }
}

const loadSnapshot = unstable_cache(
  async (): Promise<PublicCommunitySnapshot> => {
    const since = new Date(Date.now() - WINDOW_MS);
    const notBanned = { user: { banned: false } };

    const [posts, subjects, contributors, posts30d, members30d] = await Promise.all([
      section(
        "recent posts",
        async () => {
          const rows = (await prisma.feedPost.findMany({
            where: notBanned,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: RECENT_POSTS,
            select: postSelect,
          })) as unknown as Row[];
          return rows.map(toPublicPost);
        },
        [] as PublicCommunityPost[],
      ),
      section(
        "subjects",
        async () => {
          // Prisma's groupBy orderBy on _count must name a field (`_all` is
          // rejected); `subject` is non-null here so its count equals _all.
          const groups = await prisma.feedPost.groupBy({
            by: ["subject"],
            where: { subject: { not: null }, createdAt: { gte: since }, ...notBanned },
            _count: { subject: true },
            orderBy: { _count: { subject: "desc" } },
            take: TOP_SUBJECTS,
          });
          return groups
            .filter((g) => g.subject)
            .map((g) => ({ subject: g.subject as string, posts: (g._count as { subject: number }).subject }));
        },
        [] as Array<{ subject: string; posts: number }>,
      ),
      section(
        "contributors",
        async () => {
          const groups = await prisma.feedPost.groupBy({
            by: ["userId"],
            where: { createdAt: { gte: since }, ...notBanned },
            _count: { userId: true },
            orderBy: { _count: { userId: "desc" } },
            take: 5,
          });
          const ids = groups.map((g) => g.userId);
          if (ids.length === 0) return [];
          const authors = await prisma.user.findMany({
            where: { id: { in: ids }, banned: false },
            select: { id: true, name: true, avatar: true, role: true },
          });
          const byId = new Map(authors.map((a) => [a.id, a]));
          return groups
            .map((g) => {
              const u = byId.get(g.userId);
              return u
                ? { id: u.id, name: u.name, avatar: u.avatar, role: String(u.role), posts: (g._count as { userId: number }).userId }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => !!x);
        },
        [] as PublicCommunitySnapshot["contributors"],
      ),
      section("post total", () => prisma.feedPost.count({ where: { createdAt: { gte: since }, ...notBanned } }), 0),
      section(
        "member total",
        async () => {
          const raw = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
            SELECT COUNT(DISTINCT p."userId") AS n
            FROM "FeedPost" p JOIN "User" u ON u.id = p."userId"
            WHERE p."createdAt" >= ${since} AND u.banned = false
          `;
          return Number(raw[0]?.n ?? 0);
        },
        0,
      ),
    ]);

    // The subject chips filter these lists, so a chip's posts come from the
    // same 30-day window its count describes (not just the 20 newest overall).
    const perSubject = await Promise.all(
      subjects.map((s) =>
        section(
          `posts for ${s.subject}`,
          async () => {
            const rows = (await prisma.feedPost.findMany({
              where: { subject: s.subject, createdAt: { gte: since }, ...notBanned },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: SUBJECT_POSTS,
              select: postSelect,
            })) as unknown as Row[];
            return rows.map(toPublicPost);
          },
          [] as PublicCommunityPost[],
        ),
      ),
    );
    const postsBySubject: Record<string, PublicCommunityPost[]> = {};
    subjects.forEach((s, i) => {
      postsBySubject[s.subject] = perSubject[i];
    });

    return { posts, subjects, postsBySubject, contributors, totals: { posts30d, members30d } };
  },
  ["public-community-snapshot-v2"],
  { revalidate: 120, tags: ["public-community-snapshot"] },
);

export async function getPublicCommunitySnapshot(): Promise<PublicCommunitySnapshot> {
  try {
    return await loadSnapshot();
  } catch (error) {
    console.error("getPublicCommunitySnapshot error:", error);
    return { posts: [], subjects: [], postsBySubject: {}, contributors: [], totals: { posts30d: 0, members30d: 0 } };
  }
}
