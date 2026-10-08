"use server";

import { cache } from "react";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import { createDMChannel } from "@/app/actions/stream";
import { setFollow, type SocialUserDTO } from "@/app/actions/social";
import { notifyUser } from "@/app/actions/notifications";
import { getSocialViewer, getViewerFollowingIds, getFollowersAmong } from "@/lib/social-viewer";

export interface ProfileData {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  county: string;
  educationLevel: string | null;
  points: number;
  tier: string;
  streakDays: number;
  createdAt: string;
  subjects: string[];
  goals: string[];
  tutorSubjects: string[];
  isVerifiedTutor: boolean;
  hourlyRate: number | null;
  rating: number | null;
  sessionsCompleted: number;
  achievements: { type: string; title: string; icon: string }[];
  postCount: number;
  followersCount: number;
  followingCount: number;
}

export interface ViewerContext {
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  signedIn: boolean;
}

async function countConnections(column: "follower_id" | "following_id", userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq(column, userId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function connectionExists(followerId: string, followingId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("connections")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// Memoised per request: generateMetadata and the page both ask for it.
const loadProfile = cache(async (profileId: string) => {
  if (typeof profileId !== "string" || !profileId || profileId.length > 64) return null;

  const user = await prisma.user.findUnique({
    where: { id: profileId },
    // Public fields only — never email / phone / payout numbers.
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      role: true,
      county: true,
      educationLevel: true,
      points: true,
      tier: true,
      streakDays: true,
      createdAt: true,
      banned: true,
      studentProfile: { select: { subjects: true, goals: true } },
      tutorProfile: { select: { subjects: true, hourlyRate: true, rating: true, isVerified: true } },
      achievements: { orderBy: { unlockedAt: "desc" }, take: 8, select: { type: true, title: true, icon: true } },
      _count: {
        select: {
          feedPosts: true,
          sessionsAsTutor: { where: { status: "COMPLETED" } },
          sessionsAsStudent: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
  if (!user || user.banned) return null;

  // Public profiles are viewable signed out; follows use Prisma ids.
  const me = await getSocialViewer();
  const viewerId = me?.id ?? null;
  const isSelf = !!viewerId && viewerId === user.id;

  const [followersCount, followingCount, isFollowing, followsYou] = await Promise.all([
    countConnections("following_id", user.id),
    countConnections("follower_id", user.id),
    viewerId && !isSelf ? connectionExists(viewerId, user.id) : Promise.resolve(false),
    viewerId && !isSelf ? connectionExists(user.id, viewerId) : Promise.resolve(false),
  ]);

  const isTutor = String(user.role) === "TUTOR";
  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    username: user.username || null,
    avatar: user.avatar,
    bio: user.bio,
    role: String(user.role),
    county: user.county,
    educationLevel: user.educationLevel ? String(user.educationLevel) : null,
    points: user.points,
    tier: String(user.tier),
    streakDays: user.streakDays,
    createdAt: user.createdAt.toISOString(),
    subjects: user.studentProfile?.subjects ?? [],
    goals: user.studentProfile?.goals ?? [],
    tutorSubjects: user.tutorProfile?.subjects ?? [],
    isVerifiedTutor: isTutor && !!user.tutorProfile?.isVerified,
    hourlyRate: isTutor ? user.tutorProfile?.hourlyRate ?? null : null,
    rating: isTutor ? user.tutorProfile?.rating ?? null : null,
    sessionsCompleted: (user._count.sessionsAsTutor ?? 0) + (user._count.sessionsAsStudent ?? 0),
    achievements: user.achievements,
    postCount: user._count.feedPosts ?? 0,
    followersCount,
    followingCount,
  };

  const viewer: ViewerContext = { isSelf, isFollowing, followsYou, signedIn: !!viewerId };
  return { profile, viewer };
});

export async function getProfile(
  profileId: string,
): Promise<{ profile: ProfileData; viewer: ViewerContext } | null> {
  try {
    return await loadProfile(profileId);
  } catch (error) {
    console.error("getProfile error:", error);
    return null;
  }
}

const FOLLOW_PAGE = 20;

/**
 * Followers / Following of a profile, newest first, keyset-paginated on
 * (created_at, id). Each row carries the viewer's relationship to that person
 * so the list can show Follow / Following / "Follows you" without N+1.
 */
export async function getFollowList(
  profileId: string,
  type: "followers" | "following",
  cursor?: string | null,
): Promise<{ users: SocialUserDTO[]; nextCursor: string | null }> {
  const empty = { users: [], nextCursor: null };
  if (typeof profileId !== "string" || !profileId) return empty;
  if (type !== "followers" && type !== "following") return empty;
  try {
    const admin = createAdminClient();
    const column = type === "followers" ? "following_id" : "follower_id";
    const other = type === "followers" ? "follower_id" : "following_id";

    let q = admin
      .from("connections")
      .select(`id, created_at, ${other}`)
      .eq(column, profileId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(FOLLOW_PAGE + 1);

    if (cursor) {
      const [ts, id] = String(cursor).split("|");
      const validTs = ts && !Number.isNaN(Date.parse(ts));
      const validId = id && /^[0-9a-f-]{36}$/i.test(id);
      if (validTs && validId) {
        q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
      }
    }

    const { data, error } = await q;
    if (error || !data) return empty;
    const rows = data as unknown as Array<Record<string, string>>;
    const hasMore = rows.length > FOLLOW_PAGE;
    const page = hasMore ? rows.slice(0, FOLLOW_PAGE) : rows;
    const ids = page.map((r) => r[other]).filter(Boolean);
    if (ids.length === 0) return empty;

    const viewer = await getSocialViewer();
    const [users, viewerFollowing, followsViewer] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: ids }, banned: false },
        select: { id: true, name: true, avatar: true, username: true, role: true, educationLevel: true },
      }),
      viewer ? getViewerFollowingIds(viewer.id) : Promise.resolve([] as string[]),
      viewer ? getFollowersAmong(viewer.id, ids) : Promise.resolve(new Set<string>()),
    ]);
    const followingSet = new Set(viewerFollowing);
    const byId = new Map(users.map((u) => [u.id, u]));
    const last = page[page.length - 1];

    return {
      users: ids
        .map((id) => byId.get(id))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          username: u.username,
          role: String(u.role),
          educationLevel: u.educationLevel ? String(u.educationLevel) : null,
          isFollowing: followingSet.has(u.id),
          followsYou: followsViewer.has(u.id),
          isSelf: viewer?.id === u.id,
        })),
      nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
    };
  } catch (error) {
    console.error("getFollowList error:", error);
    return empty;
  }
}

/**
 * Social-style connect: follows the person AND opens (or creates) a DM,
 * returning the channel so callers can jump straight into chat.
 */
export async function connectWithUser(targetUserId: string): Promise<{
  ok: boolean;
  channelId?: string;
  error?: string;
}> {
  if (!targetUserId || typeof targetUserId !== "string") return { ok: false, error: "Missing user" };

  // Prisma id (can differ from the auth id for older/OAuth accounts). Stream
  // channels are keyed by Prisma ids.
  const me = await getSocialViewer();
  if (!me) return { ok: false, error: "Please sign in to connect." };
  if (me.id === targetUserId) return { ok: false, error: "That's you!" };

  let channelId: string;
  try {
    channelId = await createDMChannel(me.id, targetUserId);
  } catch (error) {
    console.error("[connectWithUser] DM channel failed:", error);
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      error: /not configured/i.test(message)
        ? "Messaging is temporarily unavailable."
        : /not found/i.test(message)
          ? "This user no longer exists."
          : "We couldn't open the chat. Please try again.",
    };
  }

  // Messaging someone also follows them. setFollow is idempotent, so an
  // existing follow is left alone (never silently unfollowed).
  await setFollow(targetUserId, true).catch(() => null);

  notifyUser(targetUserId, {
    type: "CONNECTION",
    title: `${me.name} wants to connect`,
    body: "They sent you a message — say hi back.",
    actionUrl: `/dashboard/messages?channel=${channelId}`,
  }).catch(() => {});

  return { ok: true, channelId };
}
