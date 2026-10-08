"use server";

import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/notifications";
import { moderateMessage } from "@/app/actions/moderation";
import { getSocialViewer, getViewerFollowingIds } from "@/lib/social-viewer";
import { decodeCursor, encodeCursor, rankForYou, type FeedCursor } from "@/lib/social-utils";

/* ──────────────────────────────────────────────────────────────────────────
   Social feed (FeedPost / PostLike / Comment).

   Everything here returns small, browser-safe DTOs: only public author
   fields (never email / phone / M-Pesa numbers), counts via _count instead of
   shipping whole relation arrays, and keyset cursor pagination so a page is a
   fixed size no matter how big the table grows.
   ────────────────────────────────────────────────────────────────────────── */

export type FeedTab = "for-you" | "following" | "latest" | "popular";

export type FeedAuthor = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  educationLevel: string | null;
  username: string | null;
};

export type FeedPostDTO = {
  id: string;
  content: string;
  image: string | null;
  subject: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
  /** Viewer follows the author. */
  authorFollowed: boolean;
  author: FeedAuthor;
};

export type FeedViewer = { id: string; name: string; avatar: string | null; role: string; educationLevel: string | null };

export type FeedPage = {
  posts: FeedPostDTO[];
  nextCursor: string | null;
  viewerId: string | null;
  viewer: FeedViewer | null;
};

export type FeedCommentDTO = {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  canDelete: boolean;
  author: { id: string; name: string; avatar: string | null; role: string };
};

const PAGE_SIZE = 12;
const COMMENT_PAGE_SIZE = 20;
const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;
const NO_USER = "__no_viewer__";
const DAY_MS = 24 * 60 * 60 * 1000;
/** For-you ranks the most recent N posts of the last 14 days, then falls back to chronological. */
const FOR_YOU_WINDOW_MS = 14 * DAY_MS;
const FOR_YOU_POOL = 300;

const authorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  educationLevel: true,
  username: true,
} as const;

function postSelect(viewerId: string | null) {
  return {
    id: true,
    userId: true,
    content: true,
    image: true,
    subject: true,
    likes: true,
    createdAt: true,
    user: { select: authorSelect },
    _count: { select: { comments: true, likedBy: true } },
    // At most one row: "did *I* like this?" without shipping every like.
    likedBy: { where: { userId: viewerId ?? NO_USER }, select: { id: true }, take: 1 },
  } as const;
}

type PostRow = {
  id: string;
  userId: string;
  content: string;
  image: string | null;
  subject: string | null;
  likes: number;
  createdAt: Date;
  user: { id: string; name: string; avatar: string | null; role: unknown; educationLevel: unknown; username: string | null };
  _count: { comments: number; likedBy: number };
  likedBy: { id: string }[];
};

type Where = Record<string, unknown>;

function toDTO(p: PostRow, viewerId: string | null, following: Set<string>): FeedPostDTO {
  return {
    id: p.id,
    content: p.content,
    image: p.image,
    subject: p.subject,
    createdAt: p.createdAt.toISOString(),
    likeCount: p._count.likedBy,
    commentCount: p._count.comments,
    likedByMe: p.likedBy.length > 0,
    isMine: !!viewerId && p.userId === viewerId,
    authorFollowed: following.has(p.userId),
    author: {
      id: p.user.id,
      name: p.user.name,
      avatar: p.user.avatar,
      role: String(p.user.role),
      educationLevel: p.user.educationLevel ? String(p.user.educationLevel) : null,
      username: p.user.username,
    },
  };
}

function clean(text: unknown, max: number) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max);
}

function and(...parts: Array<Where | null | undefined>): Where {
  const list = parts.filter((p): p is Where => !!p && Object.keys(p).length > 0);
  if (list.length === 0) return {};
  if (list.length === 1) return list[0];
  return { AND: list };
}

/** Newest first, keyset on (createdAt, id). */
async function timePage(where: Where, cursor: FeedCursor | null, take: number, viewerId: string | null) {
  const keyset =
    cursor?.kind === "time"
      ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }
      : null;
  const rows = (await prisma.feedPost.findMany({
    where: and(where, keyset),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: postSelect(viewerId),
  })) as unknown as PostRow[];
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    nextCursor: hasMore && last ? encodeCursor({ kind: "time", createdAt: last.createdAt, id: last.id }) : null,
  };
}

/** Most liked first, keyset on (likes, createdAt, id). */
async function popularPage(where: Where, cursor: FeedCursor | null, take: number, viewerId: string | null) {
  const keyset =
    cursor?.kind === "popular"
      ? {
          OR: [
            { likes: { lt: cursor.likes } },
            { likes: cursor.likes, createdAt: { lt: cursor.createdAt } },
            { likes: cursor.likes, createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : null;
  const rows = (await prisma.feedPost.findMany({
    where: and(where, keyset),
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: postSelect(viewerId),
  })) as unknown as PostRow[];
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    nextCursor:
      hasMore && last
        ? encodeCursor({ kind: "popular", likes: last.likes, createdAt: last.createdAt, id: last.id })
        : null,
  };
}

/**
 * For you: rank the last 14 days (newest 300 posts) with rankForYou()
 * (see src/lib/social-utils.ts for the formula), page through that ranked
 * window by offset, then continue chronologically with anything older.
 * `asOf` is pinned in the cursor so the window doesn't shift between pages.
 */
async function forYouPage(
  baseWhere: Where,
  cursor: FeedCursor | null,
  take: number,
  viewer: { id: string; educationLevel: unknown },
  followingIds: string[],
) {
  // Already past the ranked window → plain chronological.
  if (cursor?.kind === "time") return timePage(baseWhere, cursor, take, viewer.id);

  const asOf = cursor?.kind === "ranked" ? cursor.asOf : Date.now();
  const offset = cursor?.kind === "ranked" ? cursor.offset : 0;
  const windowStart = new Date(asOf - FOR_YOU_WINDOW_MS);

  const [pool, profile] = await Promise.all([
    prisma.feedPost.findMany({
      where: and(baseWhere, { createdAt: { gte: windowStart, lte: new Date(asOf) } }),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: FOR_YOU_POOL,
      select: { id: true, userId: true, createdAt: true, likes: true, subject: true, level: true, _count: { select: { comments: true } } },
    }),
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: { studentProfile: { select: { subjects: true } }, tutorProfile: { select: { subjects: true } } },
    }),
  ]);

  const subjects = new Set(
    [...(profile?.studentProfile?.subjects ?? []), ...(profile?.tutorProfile?.subjects ?? [])].map((s) => String(s).toLowerCase()),
  );
  const ranked = rankForYou(
    pool.map((p) => ({
      id: p.id,
      userId: p.userId,
      createdAt: p.createdAt,
      likes: p.likes,
      comments: p._count.comments,
      subject: p.subject,
      level: p.level ? String(p.level) : null,
    })),
    {
      viewerId: viewer.id,
      followingIds: new Set(followingIds),
      viewerLevel: viewer.educationLevel ? String(viewer.educationLevel) : null,
      viewerSubjects: subjects,
      now: asOf,
    },
  );

  const sliceIds = ranked.slice(offset, offset + take).map((p) => p.id);
  let rows: PostRow[] = [];
  if (sliceIds.length) {
    const full = (await prisma.feedPost.findMany({
      where: { id: { in: sliceIds } },
      select: postSelect(viewer.id),
    })) as unknown as PostRow[];
    const byId = new Map(full.map((r) => [r.id, r]));
    rows = sliceIds.map((id) => byId.get(id)).filter((r): r is PostRow => !!r);
  }

  if (offset + take < ranked.length) {
    return { rows, nextCursor: encodeCursor({ kind: "ranked", offset: offset + take, asOf }) };
  }

  // Ranked window exhausted: top the page up with older posts.
  const boundary = pool.length >= FOR_YOU_POOL ? pool[pool.length - 1].createdAt : windowStart;
  const remaining = take - rows.length;
  if (remaining <= 0) {
    return { rows, nextCursor: encodeCursor({ kind: "ranked", offset: ranked.length, asOf }) };
  }
  const older = await timePage(and(baseWhere, { createdAt: { lt: boundary } }), null, remaining, viewer.id);
  const seen = new Set(rows.map((r) => r.id));
  return { rows: [...rows, ...older.rows.filter((r) => !seen.has(r.id))], nextCursor: older.nextCursor };
}

/**
 * One page of the feed.
 * - for-you:   ranked (follows, level, subjects, engagement, freshness) — see rankForYou
 * - following: only people you follow (and you), newest first
 * - latest:    everyone, newest first
 * - popular:   most-liked in the last 30 days
 * `authorId` scopes the feed to a single profile (newest first; viewable signed out).
 */
export async function getFeedPage(
  input: {
    tab?: FeedTab;
    topic?: string | null;
    cursor?: string | null;
    authorId?: string | null;
    limit?: number;
  } = {},
): Promise<FeedPage> {
  const viewer = await getSocialViewer();
  const viewerId = viewer?.id ?? null;
  const viewerDTO: FeedViewer | null = viewer
    ? {
        id: viewer.id,
        name: viewer.name,
        avatar: viewer.avatar,
        role: String(viewer.role),
        educationLevel: viewer.educationLevel ? String(viewer.educationLevel) : null,
      }
    : null;
  const empty: FeedPage = { posts: [], nextCursor: null, viewerId, viewer: viewerDTO };

  const tabs: FeedTab[] = ["for-you", "following", "latest", "popular"];
  const tab: FeedTab = tabs.includes(input.tab as FeedTab) ? (input.tab as FeedTab) : "for-you";
  const take = Math.min(Math.max(Math.floor(Number(input.limit) || PAGE_SIZE), 1), 30);
  const cursor = decodeCursor(input.cursor);
  const authorId = typeof input.authorId === "string" && input.authorId ? input.authorId : null;
  const topic = typeof input.topic === "string" && input.topic.trim() ? input.topic.trim().slice(0, 60) : null;

  // The community feed is for signed-in Edyfra users; public profiles can
  // still show their own posts grid.
  if (!viewer && !authorId) return empty;

  try {
    const followingIds = viewerId ? await getViewerFollowingIds(viewerId) : [];
    const following = new Set(followingIds);
    const baseWhere: Where = topic ? { subject: { equals: topic, mode: "insensitive" } } : {};

    let result: { rows: PostRow[]; nextCursor: string | null };
    if (authorId) {
      result = await timePage(and(baseWhere, { userId: authorId }), cursor, take, viewerId);
    } else if (tab === "following") {
      result = await timePage(and(baseWhere, { userId: { in: [...followingIds, viewerId!] } }), cursor, take, viewerId);
    } else if (tab === "latest") {
      result = await timePage(baseWhere, cursor, take, viewerId);
    } else if (tab === "popular") {
      result = await popularPage(
        and(baseWhere, { createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } }),
        cursor,
        take,
        viewerId,
      );
    } else {
      result = await forYouPage(baseWhere, cursor, take, viewer!, followingIds);
    }

    return {
      posts: result.rows.map((p) => toDTO(p, viewerId, following)),
      nextCursor: result.nextCursor,
      viewerId,
      viewer: viewerDTO,
    };
  } catch (error) {
    console.error("getFeedPage error:", error);
    return empty;
  }
}

export async function createPost(input: {
  content: string;
  subject?: string | null;
}): Promise<{ ok: true; post: FeedPostDTO } | { ok: false; error: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in to post." };
  if (viewer.banned) return { ok: false, error: "Your account is suspended." };

  const content = clean(input?.content, MAX_POST_LENGTH);
  if (!content) return { ok: false, error: "Write something first." };
  const subject = input?.subject ? clean(input.subject, 60) || null : null;

  try {
    // Cheap flood guard: 8 posts per 10 minutes is plenty for a human.
    const recentCount = await prisma.feedPost.count({
      where: { userId: viewer.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    if (recentCount >= 8) return { ok: false, error: "You're posting very fast. Take a breather and try again in a few minutes." };

    try {
      const verdict = await moderateMessage(content, viewer.id);
      if (verdict?.should_report) return { ok: false, error: "That post was flagged by moderation. Please rephrase." };
    } catch {
      /* best-effort — never block a real student on a flaky moderation service */
    }

    const created = (await prisma.feedPost.create({
      data: {
        userId: viewer.id,
        content,
        subject,
        level: viewer.educationLevel ?? undefined,
      },
      select: postSelect(viewer.id),
    })) as unknown as PostRow;

    return { ok: true, post: toDTO(created, viewer.id, new Set()) };
  } catch (error) {
    console.error("createPost error:", error);
    return { ok: false, error: "We couldn't publish that post." };
  }
}

export async function deletePost(postId: string): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in first." };
  if (typeof postId !== "string" || !postId) return { ok: false, error: "Missing post." };
  try {
    const res = await prisma.feedPost.deleteMany({ where: { id: postId, userId: viewer.id } });
    if (res.count === 0) return { ok: false, error: "You can only delete your own posts." };
    return { ok: true };
  } catch (error) {
    console.error("deletePost error:", error);
    return { ok: false, error: "We couldn't delete that post." };
  }
}

/**
 * Sets (not toggles) the viewer's like, so a double-tap or an out-of-order
 * response can never flip the state the user ended on. Returns the
 * authoritative count for reconciliation.
 */
export async function setPostLike(
  postId: string,
  liked: boolean,
): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in to like posts." };
  if (typeof postId !== "string" || !postId) return { ok: false, error: "Missing post." };
  const want = liked === true;

  try {
    const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
    if (!post) return { ok: false, error: "That post was deleted." };

    let created = false;
    if (want) {
      try {
        await prisma.postLike.create({ data: { postId, userId: viewer.id } });
        created = true;
      } catch (e: unknown) {
        // P2002 = already liked (double tap) — that's the state we want anyway.
        if ((e as { code?: string })?.code !== "P2002") throw e;
      }
    } else {
      await prisma.postLike.deleteMany({ where: { postId, userId: viewer.id } });
    }

    // Keep the denormalised column (used to rank "popular") in sync with reality.
    const likeCount = await prisma.postLike.count({ where: { postId } });
    await prisma.feedPost.update({ where: { id: postId }, data: { likes: likeCount } });

    if (created && post.userId !== viewer.id) {
      notifyUser(post.userId, {
        type: "POST_LIKE",
        title: `${viewer.name} liked your post`,
        body: "Your post is getting love in the community.",
        actionUrl: `/profile/${post.userId}?post=${post.id}`,
      }).catch(() => {});
    }

    return { ok: true, liked: want, likeCount };
  } catch (error) {
    console.error("setPostLike error:", error);
    return { ok: false, error: "We couldn't save that like." };
  }
}

/** A single post (for deep links such as notification → /profile/<id>?post=<postId>). */
export async function getPost(postId: string): Promise<FeedPostDTO | null> {
  if (typeof postId !== "string" || !postId) return null;
  const viewer = await getSocialViewer();
  const viewerId = viewer?.id ?? null;
  try {
    const row = (await prisma.feedPost.findUnique({
      where: { id: postId },
      select: postSelect(viewerId),
    })) as unknown as PostRow | null;
    if (!row) return null;
    const following = new Set(viewerId ? await getViewerFollowingIds(viewerId) : []);
    return toDTO(row, viewerId, following);
  } catch (error) {
    console.error("getPost error:", error);
    return null;
  }
}

/**
 * Comments, oldest → newest within a page. Pages walk BACKWARDS in time from
 * the newest (`cursor` = oldest comment already shown), so the thread opens
 * on the latest conversation with a "view earlier comments" link.
 */
export async function getComments(
  postId: string,
  cursor?: string | null,
): Promise<{ comments: FeedCommentDTO[]; nextCursor: string | null }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { comments: [], nextCursor: null };
  if (typeof postId !== "string" || !postId) return { comments: [], nextCursor: null };
  try {
    const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { userId: true } });
    if (!post) return { comments: [], nextCursor: null };

    const c = decodeCursor(cursor);
    const keyset =
      c?.kind === "time"
        ? { OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }] }
        : null;

    const rows = await prisma.comment.findMany({
      where: keyset ? { AND: [{ postId }, keyset] } : { postId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: COMMENT_PAGE_SIZE + 1,
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
    const hasMore = rows.length > COMMENT_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, COMMENT_PAGE_SIZE) : rows;
    const oldest = page[page.length - 1];
    return {
      comments: page
        .map((row) => ({
          id: row.id,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
          isMine: row.userId === viewer.id,
          canDelete: row.userId === viewer.id || post.userId === viewer.id,
          author: { id: row.user.id, name: row.user.name, avatar: row.user.avatar, role: String(row.user.role) },
        }))
        .reverse(),
      nextCursor: hasMore && oldest ? encodeCursor({ kind: "time", createdAt: oldest.createdAt, id: oldest.id }) : null,
    };
  } catch (error) {
    console.error("getComments error:", error);
    return { comments: [], nextCursor: null };
  }
}

export async function addComment(
  postId: string,
  content: string,
): Promise<{ ok: true; comment: FeedCommentDTO } | { ok: false; error: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in to comment." };
  if (viewer.banned) return { ok: false, error: "Your account is suspended." };
  if (typeof postId !== "string" || !postId) return { ok: false, error: "Missing post." };

  const text = clean(content, MAX_COMMENT_LENGTH);
  if (!text) return { ok: false, error: "Comment can't be empty." };

  try {
    const [post, recent] = await Promise.all([
      prisma.feedPost.findUnique({ where: { id: postId }, select: { id: true, userId: true } }),
      prisma.comment.count({ where: { userId: viewer.id, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }),
    ]);
    if (!post) return { ok: false, error: "That post was deleted." };
    if (recent >= 20) return { ok: false, error: "You're commenting very fast. Give it a minute." };

    try {
      const verdict = await moderateMessage(text, viewer.id);
      if (verdict?.should_report) return { ok: false, error: "That comment was flagged by moderation. Please rephrase." };
    } catch {
      /* best-effort */
    }

    const c = await prisma.comment.create({
      data: { postId, userId: viewer.id, content: text },
      select: { id: true, content: true, createdAt: true },
    });

    if (post.userId !== viewer.id) {
      notifyUser(post.userId, {
        type: "POST_COMMENT",
        title: `${viewer.name} commented on your post`,
        body: text.length > 100 ? `${text.slice(0, 100)}…` : text,
        actionUrl: `/profile/${post.userId}?post=${post.id}`,
      }).catch(() => {});
    }

    return {
      ok: true,
      comment: {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        isMine: true,
        canDelete: true,
        author: { id: viewer.id, name: viewer.name, avatar: viewer.avatar, role: String(viewer.role) },
      },
    };
  } catch (error) {
    console.error("addComment error:", error);
    return { ok: false, error: "We couldn't post that comment." };
  }
}

export async function deleteComment(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in first." };
  if (typeof commentId !== "string" || !commentId) return { ok: false, error: "Missing comment." };
  try {
    // Your own comment, or any comment on your own post.
    const res = await prisma.comment.deleteMany({
      where: { id: commentId, OR: [{ userId: viewer.id }, { post: { userId: viewer.id } }] },
    });
    if (res.count === 0) return { ok: false, error: "You can't delete that comment." };
    return { ok: true };
  } catch (error) {
    console.error("deleteComment error:", error);
    return { ok: false, error: "We couldn't delete that comment." };
  }
}

/** Subjects with the most posts in the last 30 days. */
export async function getTrendingSubjects(limit = 6): Promise<Array<{ subject: string; posts: number }>> {
  try {
    const groups = await prisma.feedPost.groupBy({
      by: ["subject"],
      where: { subject: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
      _count: { _all: true },
      // @ts-expect-error - _count orderBy type mismatch in generated client
      orderBy: { _count: { _all: "desc" } },
      take: Math.min(Math.max(Math.floor(Number(limit) || 6), 1), 20),
    });

    return groups
      .filter((g) => g.subject)
      .map((g) => ({
        subject: g.subject as string,
        posts: (g._count as { _all: number })._all,
      }));
  } catch (error) {
    console.error("getTrendingSubjects error:", error);
    return [];
  }
}
