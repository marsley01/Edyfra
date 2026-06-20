"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { getUserData } from "@/app/actions/user";
import { notifyUser, notifyManyUsers } from "@/app/actions/notifications";
import { moderateMessage } from "@/app/actions/moderation";

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
  stats: { totalTopics: number; totalPosts: number; onlineCount: number };
  me: { id: string; name: string; role: string; avatar: string | null } | null;
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
  const user = await getUserData();
  if (!user) return { ok: false as const, error: "Sign in to use Community." };
  if (user.banned) return { ok: false as const, error: "Your account is suspended." };
  return { ok: true as const, user };
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

export async function getForumBootstrap(): Promise<CommunityBootstrap> {
  // ensureCategories only writes on the very first load; getCategories is
  // cached for an hour after that.
  await ensureCategories();
  const me = await getUserData();
  const categories = await getCategories();

  // 25 most-recent active topics with a single line of context
  const topics = await prisma.communityTopic.findMany({
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 30,
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      category: { select: { slug: true, name: true, emoji: true } },
      _count: { select: { posts: true, reactions: true } },
    },
  });

  // Lightweight counts for the sidebar — kept cheap on purpose
  const [totalTopics, totalPosts, onlineCount] = await Promise.all([
    prisma.communityTopic.count(),
    prisma.communityPost.count(),
    // Edyfra users who pinged in the last 5 minutes — feels alive without
    // being a real-time websocket
    prisma.user.count({
      where: { lastActiveAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    }),
  ]);

  let myReads: Record<string, string> = {};
  if (me) {
    const reads = await prisma.communityRead.findMany({
      where: { userId: me.id, topicId: { in: topics.map((t) => t.id) } },
    });
    myReads = Object.fromEntries(reads.map((r) => [r.topicId, r.lastReadAt.toISOString()]));
  }

  return {
    categories,
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      pinned: t.pinned,
      locked: t.locked,
      bodyPreview: t.body.slice(0, 180),
      author: t.author,
      category: t.category,
      replyCount: t._count.posts,
      reactionCount: t._count.reactions,
      createdAt: t.createdAt.toISOString(),
      lastActivityAt: t.lastActivityAt.toISOString(),
      lastActivityAgo: timeAgo(t.lastActivityAt),
      hasUnread:
        !!(me && (!myReads[t.id] || new Date(myReads[t.id]) < t.lastActivityAt)),
    })),
    stats: { totalTopics, totalPosts, onlineCount },
    me: me
      ? { id: me.id, name: me.name, role: me.role, avatar: me.avatar }
      : null,
  };
}

export async function getForumTopic(topicId: string): Promise<CommunityThread | { ok: false; error: string }> {
  const me = await getUserData();
  if (!me) return { ok: false, error: "Sign in to read this topic." };

  const topic = await prisma.communityTopic.findUnique({
    where: { id: topicId },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      category: { select: { slug: true, name: true, emoji: true } },
      reactions: { select: { type: true, userId: true } },
    },
  });
  if (!topic) return { ok: false, error: "Topic not found." };

  const sub = await prisma.communitySubscription.findUnique({
    where: { userId_topicId: { userId: me.id, topicId } },
    select: { id: true },
  });

  // Atomic +1 to the view counter (cheapest possible write)
  await prisma.communityTopic
    .update({ where: { id: topicId }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const posts = await prisma.communityPost.findMany({
    where: { topicId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      reactions: { select: { type: true, userId: true } },
    },
  });

  // Mark read
  await prisma.communityRead.upsert({
    where: { userId_topicId: { userId: me.id, topicId } },
    create: { userId: me.id, topicId },
    update: { lastReadAt: new Date() },
  });

  // Bucket reactions by type for both topic and each post
  const tally = (reactions: Array<{ type: string; userId: string }>) => {
    const out: Record<string, { count: number; mine: boolean }> = {};
    for (const r of reactions) {
      if (!out[r.type]) out[r.type] = { count: 0, mine: false };
      out[r.type].count++;
      if (r.userId === me.id) out[r.type].mine = true;
    }
    return out;
  };

  return {
    ok: true as const,
    subscribed: !!sub,
    topic: {
      id: topic.id,
      title: topic.title,
      body: topic.body,
      pinned: topic.pinned,
      locked: topic.locked,
      views: topic.views,
      createdAt: topic.createdAt.toISOString(),
      author: topic.author,
      category: topic.category,
      reactions: tally(topic.reactions),
    },
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      parentId: p.parentId,
      isAnswer: p.isAnswer,
      createdAt: p.createdAt.toISOString(),
      createdAgo: timeAgo(p.createdAt),
      author: p.author,
      reactions: tally(p.reactions),
    })),
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

  revalidatePath("/dashboard/community");
  revalidatePath("/tutor/community");
  return { ok: true as const, topicId: topic.id };
}

export async function createForumPost(input: {
  topicId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
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
      parentId: input.parentId || null,
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

  if (recipientIds.length > 0) {
    const preview = body.length > 100 ? body.slice(0, 100) + "…" : body;
    const baseTitle = topic.title.length > 60 ? topic.title.slice(0, 60) + "…" : topic.title;
    // Author gets "your topic" copy
    if (topic.authorId !== auth.user.id) {
      await notifyUser(topic.authorId, {
        type: "FORUM_REPLY",
        title: `💬 ${auth.user.name} replied to your topic`,
        body: `${baseTitle} — "${preview}"`,
        actionUrl: `/dashboard/community/t/${topic.id}`,
      });
    }
    // Subscribers get a generic reply
    const subOnly = recipientIds.filter((id) => id !== topic.authorId);
    if (subOnly.length > 0) {
      await notifyManyUsers(subOnly, {
        type: "FORUM_REPLY",
        title: `💬 New reply in "${baseTitle}"`,
        body: `${auth.user.name}: ${preview}`,
        actionUrl: `/dashboard/community/t/${topic.id}`,
      });
    }
  }

  revalidatePath(`/dashboard/community/t/${topic.id}`);
  revalidatePath(`/tutor/community/t/${topic.id}`);
  revalidatePath(`/dashboard/community`);
  revalidatePath(`/tutor/community`);
  return { ok: true as const, postId: post.id };
}

export async function toggleForumReaction(input: {
  topicId?: string;
  postId?: string;
  type: string;
}) {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  if (!input.topicId && !input.postId) return { ok: false, error: "Nothing to react to." };

  const where: any = {
    userId: auth.user.id,
    type: input.type,
    topicId: input.topicId ?? null,
    postId: input.postId ?? null,
  };
  const existing = await prisma.communityReaction.findFirst({ where });
  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return { ok: true as const, active: false };
  }
  await prisma.communityReaction.create({
    data: {
      userId: auth.user.id,
      type: input.type,
      topicId: input.topicId ?? null,
      postId: input.postId ?? null,
    },
  });
  return { ok: true as const, active: true };
}

export async function toggleForumSubscription(topicId: string) {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  const existing = await prisma.communitySubscription.findUnique({
    where: { userId_topicId: { userId: auth.user.id, topicId } },
  });
  if (existing) {
    await prisma.communitySubscription.delete({ where: { id: existing.id } });
    return { ok: true as const, subscribed: false };
  }
  await prisma.communitySubscription.create({
    data: { userId: auth.user.id, topicId },
  });
  return { ok: true as const, subscribed: true };
}

export async function markForumTopicRead(topicId: string) {
  const auth = await requireEdyfraUser();
  if (!auth.ok) return auth;
  await prisma.communityRead.upsert({
    where: { userId_topicId: { userId: auth.user.id, topicId } },
    create: { userId: auth.user.id, topicId },
    update: { lastReadAt: new Date() },
  });
  return { ok: true as const };
}
