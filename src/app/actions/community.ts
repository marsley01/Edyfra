"use server";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { notifyUser, notifyManyUsers } from "@/lib/notifications/server";
import { moderateMessage } from "@/app/actions/moderation";
import { getSocialViewer } from "@/lib/social-viewer";
import { decodeCursor, encodeCursor } from "@/lib/social-utils";

/* ──────────────────────────────────────────────────────────────────────────
   Categories are seeded once on first load. They're stable, ordered, and
   cover the typical Kenyan-curriculum / tertiary mix. They live in the DB
   (not hard-coded) so admins can re-order them later.
   ────────────────────────────────────────────────────────────────────────── */

const CATEGORY_SEED: Array<{ slug: string; name: string; emoji: string; blurb: string; order: number }> = [
  { slug: "math",        name: "Mathematics",   emoji: "🧮", blurb: "Algebra, calculus, stats — let's get unstuck together.", order: 1 },
  { slug: "sciences",    name: "Sciences",      emoji: "🔬", blurb: "Physics, chem, bio. Labs, past papers, doubts.",     order: 2 },
  { slug: "tech",        name: "Tech & Coding", emoji: "💻", blurb: "Python, JS, web dev, debugging. Show your code.",   order: 3 },
  { slug: "languages",   name: "Languages",     emoji: "🗣️", blurb: "English, Kiswahili, French — essay help & grammar.",  order: 4 },
  { slug: "kcse",        name: "KCSE Corner",   emoji: "📚", blurb: "Form 4 prep, revision groups, past paper marathons.", order: 5 },
  { slug: "campus",      name: "Campus Life",   emoji: "🎓", blurb: "University, polytechnic, TVET — units, hostels, life.", order: 6 },
  { slug: "life",        name: "Life & Vibe",   emoji: "🌅", blurb: "Mental health, motivation, side hustles, friendships.", order: 7 },
  { slug: "help",        name: "Ask for Help",  emoji: "🙋", blurb: "Stuck on something? Drop a topic. Someone's awake.", order: 8 },
];

// Categories are seeded once and never change at runtime. Cache the read for
// 1 hour so the bootstrap doesn't pay a DB round-trip on every page load.
const getCategories = unstable_cache(
  async () => {
    return prisma.communityCategory.findMany({ orderBy: { order: "asc" } });
  },
  ["community-categories"],
  { revalidate: 3600, tags: ["community-categories"] },
);

async function ensureCategories() {
  const existing = await prisma.communityCategory.count();
  if (existing >= CATEGORY_SEED.length) return;
  await prisma.communityCategory.createMany({
    data: CATEGORY_SEED,
    skipDuplicates: true,
  });
}

// Must match the REACTIONS list in components/community/CommunityForum.tsx
const REACTION_TYPES = new Set(["heart", "fire", "hug", "idea", "yay", "eyes"]);

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

export type CommunityBootstrap = {
  categories: Array<{ id: string; slug: string; name: string; emoji: string; blurb: string }>;
  topics: Array<{
    id: string;
    title: string;
    pinned: boolean;
    locked: boolean;
    bodyPreview: string;
    author: { id: string; name: string; avatar: string | null; role: string };
    category: { slug: string; name: string; emoji: string };
    replyCount: number;
    reactionCount: number;
    createdAt: string;
    lastActivityAt: string;
    lastActivityAgo: string;
    hasUnread: boolean;
  }>;
  stats: { totalTopics: number; totalPosts: number };
  me: { id: string; name: string; role: string; avatar: string | null } | null;
  /** Pass back to getForumBootstrap to load the next page of (non-pinned) topics. */
  nextCursor: string | null;
};

export type CommunityThreadPost = {
  id: string;
  body: string;
  parentId: string | null;
  isAnswer: boolean;
  createdAt: string;
  createdAgo: string;
  author: { id: string; name: string; avatar: string | null; role: string };
  reactions: Record<string, { count: number; mine: boolean }>;
};

export type CommunityThread = {
  ok: true;
  subscribed: boolean;
  topic: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    locked: boolean;
    views: number;
    createdAt: string;
    author: { id: string; name: string; avatar: string | null; role: string };
    category: { slug: string; name: string; emoji: string };
    reactions: Record<string, { count: number; mine: boolean }>;
  };
  posts: CommunityThreadPost[];
};

/**
 * The single source of truth for "is this caller an Edyfra user?". Every
 * action in this file starts with this guard. No unauthenticated request —
 * including read endpoints — gets past it. That's the Edyfra-users-only
 * contract for the community.
 */
async function requireEdyfraUser() {
  // getSocialViewer resolves the Prisma id (auth id OR email) and, unlike
  // getUserData(), never writes (no daily rewards / tier recalcs) on reads.
  const user = await getSocialViewer();
  if (!user) return { ok: false as const, error: "Sign in to use Community." };
  if (user.banned) return { ok: false as const, error: "Your account is suspended." };
  return { ok: true as const, user };
}

const TOPIC_PAGE = 20;
const MAX_THREAD_POSTS = 500;

type ReactionTally = Record<string, { count: number; mine: boolean }>;

/** Reaction counts per target via groupBy + the viewer's own reactions — never every reaction row. */
async function tallyReactions(
  field: "topicId" | "postId",
  ids: string[],
  viewerId: string,
): Promise<Map<string, ReactionTally>> {
  const out = new Map<string, ReactionTally>();
  if (ids.length === 0) return out;
  const [groups, mine] = await Promise.all([
    prisma.communityReaction.groupBy({
      by: [field, "type"],
      where: { [field]: { in: ids } },
      _count: { _all: true },
    }),
    prisma.communityReaction.findMany({
      where: { [field]: { in: ids }, userId: viewerId },
      select: { topicId: true, postId: true, type: true },
    }),
  ]);
  for (const g of groups as unknown as Array<Record<string, unknown> & { type: string; _count: { _all: number } }>) {
    const id = g[field] as string | null;
    if (!id) continue;
    const t = out.get(id) ?? {};
    t[g.type] = { count: g._count._all, mine: false };
    out.set(id, t);
  }
  for (const r of mine) {
    const id = r[field];
    if (!id) continue;
    const t = out.get(id) ?? {};
    t[r.type] = { count: t[r.type]?.count ?? 1, mine: true };
    out.set(id, t);
  }
  return out;
}

function timeAgo(d: Date) {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

/* ──────────────────────────────────────────────────────────────────────────
   Public-shaped server actions
   ────────────────────────────────────────────────────────────────────────── */

export async function getForumBootstrap(
  input: { category?: string | null; q?: string | null; cursor?: string | null } = {},
): Promise<CommunityBootstrap | { ok: false; error: string }> {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  const me = auth.user;

  let categories = await getCategories();
  if (categories.length < CATEGORY_SEED.length) {
    // First ever load: seed, then read fresh (the cached read is still empty).
    await ensureCategories();
    categories = await prisma.communityCategory.findMany({ orderBy: { order: "asc" } });
  }

  const slug = typeof input?.category === "string" && input.category ? input.category : null;
  const q = typeof input?.q === "string" ? input.q.trim().slice(0, 80) : "";
  const cursor = decodeCursor(input?.cursor);
  const categoryId = slug ? categories.find((c) => c.slug === slug)?.id ?? "__none__" : null;

  const filters: Record<string, unknown>[] = [];
  if (categoryId) filters.push({ categoryId });
  if (q) {
    filters.push({
      OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }],
    });
  }

  const topicInclude = {
    author: { select: { id: true, name: true, avatar: true, role: true } },
    category: { select: { slug: true, name: true, emoji: true } },
    _count: { select: { posts: true, reactions: true } },
  } as const;

  // Pinned topics only head the first page; everything else pages by
  // (lastActivityAt, id) keyset so "load more" never repeats or skips.
  const keyset =
    cursor?.kind === "time"
      ? { OR: [{ lastActivityAt: { lt: cursor.createdAt } }, { lastActivityAt: cursor.createdAt, id: { lt: cursor.id } }] }
      : null;

  const [pinned, rows] = await Promise.all([
    cursor
      ? Promise.resolve([])
      : prisma.communityTopic.findMany({
          where: { AND: [...filters, { pinned: true }] },
          orderBy: [{ lastActivityAt: "desc" }],
          take: 10,
          include: topicInclude,
        }),
    prisma.communityTopic.findMany({
      where: { AND: [...filters, { pinned: false }, ...(keyset ? [keyset] : [])] },
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      take: TOPIC_PAGE + 1,
      include: topicInclude,
    }),
  ]);
  const hasMore = rows.length > TOPIC_PAGE;
  const page = hasMore ? rows.slice(0, TOPIC_PAGE) : rows;
  const topics = [...pinned, ...page];
  const last = page[page.length - 1];

  // Lightweight counts for the header — only on the first page.
  // No "online now" figure: there is no real presence signal (lastActiveAt is
  // only written once a day), so any such number would be misleading.
  const [totalTopics, totalPosts] = cursor
    ? [0, 0]
    : await Promise.all([prisma.communityTopic.count(), prisma.communityPost.count()]);

  const reads = await prisma.communityRead.findMany({
    where: { userId: me.id, topicId: { in: topics.map((t) => t.id) } },
    select: { topicId: true, lastReadAt: true },
  });
  const myReads = new Map(reads.map((r) => [r.topicId, r.lastReadAt]));

  return {
    categories: categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji, blurb: c.blurb })),
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      pinned: t.pinned,
      locked: t.locked,
      bodyPreview: t.body.slice(0, 180),
      author: { ...t.author, role: String(t.author.role) },
      category: t.category,
      replyCount: t._count.posts,
      reactionCount: t._count.reactions,
      createdAt: t.createdAt.toISOString(),
      lastActivityAt: t.lastActivityAt.toISOString(),
      lastActivityAgo: timeAgo(t.lastActivityAt),
      hasUnread: t.authorId !== me.id && (!myReads.has(t.id) || myReads.get(t.id)! < t.lastActivityAt),
    })),
    stats: { totalTopics, totalPosts },
    me: { id: me.id, name: me.name, role: String(me.role), avatar: me.avatar },
    nextCursor: hasMore && last ? encodeCursor({ kind: "time", createdAt: last.lastActivityAt, id: last.id }) : null,
  };
}

export async function getForumTopic(
  topicId: string,
  opts: { countView?: boolean } = {},
): Promise<CommunityThread | { ok: false; error: string }> {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const me = auth.user;
  if (typeof topicId !== "string" || !topicId) return { ok: false, error: "Topic not found." };
  const countView = opts?.countView !== false;

  const topic = await prisma.communityTopic.findUnique({
    where: { id: topicId },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });
  if (!topic) return { ok: false, error: "Topic not found." };

  const [sub, posts] = await Promise.all([
    prisma.communitySubscription.findUnique({
      where: { userId_topicId: { userId: me.id, topicId } },
      select: { id: true },
    }),
    prisma.communityPost.findMany({
      where: { topicId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: MAX_THREAD_POSTS,
      select: {
        id: true,
        body: true,
        parentId: true,
        isAnswer: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    }),
    // Opening a thread counts a view and marks it read; background refreshes don't.
    countView
      ? prisma.communityTopic.update({ where: { id: topicId }, data: { views: { increment: 1 } } }).catch(() => null)
      : null,
    countView
      ? prisma.communityRead
          .upsert({
            where: { userId_topicId: { userId: me.id, topicId } },
            create: { userId: me.id, topicId },
            update: { lastReadAt: new Date() },
          })
          .catch(() => null)
      : null,
  ]);

  const [topicTally, postTally] = await Promise.all([
    tallyReactions("topicId", [topic.id], me.id),
    tallyReactions("postId", posts.map((p) => p.id), me.id),
  ]);

  return {
    ok: true as const,
    subscribed: !!sub,
    topic: {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      pinned: topic.pinned,
      locked: topic.locked,
      views: topic.views + (countView ? 1 : 0),
      createdAt: topic.createdAt.toISOString(),
      author: { ...topic.author, role: String(topic.author.role) },
      category: topic.category,
      reactions: topicTally.get(topic.id) ?? {},
    },
    posts: posts.map((p) => toThreadPost(p, postTally.get(p.id) ?? {})),
  };
}

function toThreadPost(
  p: {
    id: string;
    body: string;
    parentId: string | null;
    isAnswer: boolean;
    createdAt: Date;
    author: { id: string; name: string; avatar: string | null; role: unknown };
  },
  reactions: ReactionTally,
): CommunityThreadPost {
  return {
    id: p.id,
    body: p.body,
    parentId: p.parentId,
    isAnswer: p.isAnswer,
    createdAt: p.createdAt.toISOString(),
    createdAgo: timeAgo(p.createdAt),
    author: { ...p.author, role: String(p.author.role) },
    reactions,
  };
}

/* ─── Mutations ──────────────────────────────────────────────────────────── */

export async function createForumTopic(input: {
  categoryId: string;
  title: string;
  body: string;
}): Promise<{ ok: true; topicId: string } | { ok: false; error: string }> {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;

  const title = (input.title || "").trim().slice(0, 160);
  const body = (input.body || "").trim().slice(0, 8000);
  if (!title || title.length < 4) return { ok: false, error: "Give your topic a clear title (4+ chars)." };
  if (!body || body.length < 10) return { ok: false, error: "Add a little more context (10+ chars)." };

  const cat = await prisma.communityCategory.findUnique({ where: { id: input.categoryId } });
  if (!cat) return { ok: false, error: "Pick a category." };

  // Light moderation on the body — same call the chat uses
  try {
    const verdict = await moderateMessage(body, auth.user.id);
    if (verdict?.should_report) {
      return { ok: false, error: "That post was flagged. Please rephrase." };
    }
  } catch {
    // best-effort — never block a real student on a flaky moderation svc
  }

  const topic = await prisma.communityTopic.create({
    data: {
      authorId: auth.user.id,
      categoryId: cat.id,
      title,
      body,
    },
  });

  return { ok: true as const, topicId: topic.id };
}

export async function createForumPost(input: {
  topicId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ ok: true; postId: string; post: CommunityThreadPost } | { ok: false; error: string }> {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;

  const body = (input.body || "").trim().slice(0, 4000);
  if (!body || body.length < 1) return { ok: false, error: "Reply can't be empty." };

  const topic = await prisma.communityTopic.findUnique({
    where: { id: input.topicId },
    select: { id: true, locked: true, authorId: true, title: true, categoryId: true },
  });
  if (!topic) return { ok: false, error: "Topic not found." };
  if (topic.locked) return { ok: false, error: "This topic is locked." };

  // The UI only threads one level deep under top-level posts, so a parent
  // must be a top-level post in this same topic — otherwise the reply would
  // be saved but never rendered anywhere.
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.communityPost.findUnique({
      where: { id: input.parentId },
      select: { topicId: true, parentId: true },
    });
    if (!parent || parent.topicId !== topic.id) {
      return { ok: false, error: "The reply you're answering no longer exists." };
    }
    parentId = parent.parentId ?? input.parentId;
  }

  try {
    const verdict = await moderateMessage(body, auth.user.id);
    if (verdict?.should_report) {
      return { ok: false, error: "That reply was flagged. Please rephrase." };
    }
  } catch {}

  const post = await prisma.communityPost.create({
    data: {
      topicId: topic.id,
      authorId: auth.user.id,
      body,
      parentId,
    },
    select: {
      id: true,
      body: true,
      parentId: true,
      isAnswer: true,
      createdAt: true,
      author: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });

  // Bump last-activity so the topic jumps to the top
  await prisma.communityTopic.update({
    where: { id: topic.id },
    data: { lastActivityAt: new Date() },
  });

  // ─── Edyfra-users-only notification fan-out ───────────────────────────
  // Only users with an Edyfra account receive this — never guest emails
  // and never anonymous web subscribers. Subscribers of the topic + the
  // author both get pinged, with the author demoted to "your topic" copy.
  const subs = await prisma.communitySubscription.findMany({
    where: { topicId: topic.id, userId: { not: auth.user.id } },
    select: { userId: true },
  });
  const subscriberIds = subs.map((s) => s.userId);
  const recipientIds = Array.from(
    new Set([...subscriberIds, topic.authorId].filter((id) => id !== auth.user.id))
  );

  // Notifications are best-effort: the reply is already saved, so a failed
  // ping must not surface as "couldn't post" (which invites duplicate posts).
  if (recipientIds.length > 0) {
    try {
      const preview = body.length > 100 ? body.slice(0, 100) + "…" : body;
      const baseTitle = topic.title.length > 60 ? topic.title.slice(0, 60) + "…" : topic.title;
      // There is no per-topic route; the forum opens a thread via ?topic=.
      // Tutors live under /tutor, everyone else under /dashboard.
      const recipients = await prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, role: true },
      });
      const roleOf = new Map(recipients.map((u) => [u.id, u.role as string]));
      const urlFor = (id: string) =>
        `${roleOf.get(id) === "TUTOR" ? "/tutor/community" : "/dashboard/community"}?topic=${topic.id}`;

      // Author gets "your topic" copy
      if (topic.authorId !== auth.user.id) {
        await notifyUser(topic.authorId, {
          type: "FORUM_REPLY",
          title: `💬 ${auth.user.name} replied to your topic`,
          body: `${baseTitle} — "${preview}"`,
          actionUrl: urlFor(topic.authorId),
        });
      }
      // Subscribers get a generic reply (grouped so each gets the right URL)
      const subOnly = recipientIds.filter((id) => id !== topic.authorId);
      const tutorSubs = subOnly.filter((id) => roleOf.get(id) === "TUTOR");
      const otherSubs = subOnly.filter((id) => roleOf.get(id) !== "TUTOR");
      for (const group of [tutorSubs, otherSubs]) {
        if (group.length === 0) continue;
        await notifyManyUsers(group, {
          type: "FORUM_REPLY",
          title: `💬 New reply in "${baseTitle}"`,
          body: `${auth.user.name}: ${preview}`,
          actionUrl: urlFor(group[0]),
        });
      }
    } catch (err) {
      console.error("[createForumPost] notification fan-out failed:", err);
    }
  }

  return { ok: true as const, postId: post.id, post: toThreadPost(post, {}) };
}

export async function toggleForumReaction(input: {
  topicId?: string;
  postId?: string;
  type: string;
}): Promise<{ ok: true; active: boolean } | { ok: false; error: string }> {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  if (!input.topicId && !input.postId) return { ok: false, error: "Nothing to react to." };
  if (!REACTION_TYPES.has(input.type)) return { ok: false, error: "Unknown reaction." };

  // A reaction targets exactly one thing: a post wins over a topic.
  const postId = input.postId ?? null;
  const topicId = postId ? null : input.topicId ?? null;

  const target = postId
    ? await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true } })
    : await prisma.communityTopic.findUnique({ where: { id: topicId! }, select: { id: true } });
  if (!target) return { ok: false, error: "That post no longer exists." };

  const where = { userId: auth.user.id, type: input.type, topicId, postId };
  try {
    const existing = await prisma.communityReaction.findFirst({ where });
    if (existing) {
      await prisma.communityReaction.deleteMany({ where: { id: existing.id } });
      return { ok: true as const, active: false };
    }
    await prisma.communityReaction.create({
      data: { userId: auth.user.id, type: input.type, topicId, postId },
    });
    return { ok: true as const, active: true };
  } catch (err) {
    // Double-tap race: the unique constraint already holds this reaction.
    if ((err as { code?: string })?.code === "P2002") return { ok: true as const, active: true };
    console.error("toggleForumReaction error:", err);
    return { ok: false, error: "Couldn't save your reaction." };
  }
}

export async function toggleForumSubscription(topicId: string) {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  const topic = await prisma.communityTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!topic) return { ok: false as const, error: "Topic not found." };
  const existing = await prisma.communitySubscription.findUnique({
    where: { userId_topicId: { userId: auth.user.id, topicId } },
  });
  if (existing) {
    await prisma.communitySubscription.deleteMany({ where: { id: existing.id } });
    return { ok: true as const, subscribed: false };
  }
  await prisma.communitySubscription.upsert({
    where: { userId_topicId: { userId: auth.user.id, topicId } },
    create: { userId: auth.user.id, topicId },
    update: {},
  });
  return { ok: true as const, subscribed: true };
}

export async function markForumTopicRead(topicId: string) {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  const topic = await prisma.communityTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!topic) return { ok: false as const, error: "Topic not found." };
  await prisma.communityRead.upsert({
    where: { userId_topicId: { userId: auth.user.id, topicId } },
    create: { userId: auth.user.id, topicId },
    update: { lastReadAt: new Date() },
  });
  return { ok: true as const };
}
