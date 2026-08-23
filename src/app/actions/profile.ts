"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createDMChannel } from "@/app/actions/stream";
import { toggleFollow } from "@/app/actions/social";
import { notifyUser } from "@/app/actions/notifications";

export interface ProfilePost {
  id: string;
  content: string;
  subject: string | null;
  likes: number;
  createdAt: string;
  commentCount: number;
}

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
  plan: string;
  createdAt: string;
  subjects: string[];
  goals: string[];
  studyStyle: string | null;
  tutorSubjects: string[];
  hourlyRate: number | null;
  rating: number | null;
  sessionsCompleted: number;
  achievements: { type: string; title: string; icon: string }[];
  posts: ProfilePost[];
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

export async function getProfile(
  profileId: string,
): Promise<{ profile: ProfileData; viewer: ViewerContext } | null> {
  const user = await prisma.user.findUnique({
    where: { id: profileId },
    include: {
      studentProfile: { select: { subjects: true, goals: true, studyStyle: true } },
      tutorProfile: { select: { subjects: true, hourlyRate: true, rating: true } },
      _count: {
        select: {
          feedPosts: true,
          sessionsAsTutor: { where: { status: "COMPLETED" } },
          sessionsAsStudent: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  if (!user) return null;

  // Supabase auth session (may be null — public profiles are viewable signed out)
  let authId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    authId = authUser?.id ?? null;
  } catch {
    authId = null;
  }

  const isSelf = !!authId && (authId === user.id || authId === user.email);

  const [followersCount, followingCount, isFollowing, followsYou] = await Promise.all([
    countConnections("following_id", user.id),
    countConnections("follower_id", user.id),
    authId ? connectionExists(authId, user.id) : Promise.resolve(false),
    authId && !isSelf ? connectionExists(user.id, authId) : Promise.resolve(false),
  ]);

  const [posts, achievements] = await Promise.all([
    prisma.feedPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { comments: true } } },
    }),
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: "desc" },
      take: 8,
    }),
  ]);

  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    username: user.username || user.name.toLowerCase().replace(/\s+/g, "_"),
    avatar: user.avatar,
    bio: user.bio,
    role: user.role as string,
    county: user.county,
    educationLevel: user.educationLevel ?? null,
    points: user.points,
    tier: user.tier as string,
    streakDays: user.streakDays,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
    subjects: (user.studentProfile?.subjects as string[]) || [],
    goals: user.studentProfile?.goals || [],
    studyStyle: user.studentProfile?.studyStyle || null,
    tutorSubjects: user.tutorProfile?.subjects || [],
    hourlyRate: user.tutorProfile?.hourlyRate ?? null,
    rating: user.tutorProfile?.rating ?? null,
    sessionsCompleted:
      (user._count.sessionsAsTutor ?? 0) + (user._count.sessionsAsStudent ?? 0),
    achievements: achievements.map((a) => ({
      type: a.type,
      title: a.title,
      icon: a.icon,
    })),
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      subject: p.subject,
      likes: p.likes,
      createdAt: p.createdAt.toISOString(),
      commentCount: p._count.comments,
    })),
    postCount: user._count.feedPosts ?? 0,
    followersCount,
    followingCount,
  };

  const viewer: ViewerContext = {
    isSelf,
    isFollowing,
    followsYou,
    signedIn: !!authId,
  };

  return { profile, viewer };
}

/**
 * Followers / Following lists for the profile stat modals.
 * Resolves connection rows to real user profiles.
 */
export async function getFollowList(
  profileId: string,
  type: "followers" | "following"
): Promise<{ id: string; name: string; avatar: string | null; tier: string }[]> {
  try {
    const admin = createAdminClient();
    const column = type === "followers" ? "following_id" : "follower_id";
    const other = type === "followers" ? "follower_id" : "following_id";

    const { data, error } = await admin
      .from("connections")
      .select(other)
      .eq(column, profileId)
      .limit(100);
    if (error || !data) return [];

    const ids = (data as Array<Record<string, string>>).map((row) => row[other]).filter(Boolean);
    if (ids.length === 0) return [];

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatar: true, tier: true },
    });

    // Preserve connection recency order
    const byId = new Map(users.map((u) => [u.id, u]));
    return ids
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({ id: u.id, name: u.name, avatar: u.avatar, tier: u.tier as string }));
  } catch {
    return [];
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
  if (!targetUserId) return { ok: false, error: "Missing user" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to connect." };
  if (user.id === targetUserId) return { ok: false, error: "That's you!" };

  // Resolve the Prisma id for the current user (they can differ from auth ids
  // for some OAuth accounts). Stream channels are keyed by Prisma ids.
  const me = await prisma.user.findFirst({
    where: { OR: [{ id: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
    select: { id: true },
  });
  if (!me) return { ok: false, error: "Account not found." };
  if (me.id === targetUserId) return { ok: false, error: "That's you!" };

  const channelId = await createDMChannel(me.id, targetUserId);

  // Follow is best-effort — DM should still open if the follow write fails.
  try {
    await toggleFollow(targetUserId);
  } catch {
    /* non-fatal */
  }

  notifyUser(targetUserId, {
    type: "CONNECTION",
    title: "Someone wants to connect!",
    body: "They sent you a message — say hi back.",
    actionUrl: `/dashboard/messages?channel=${channelId}`,
  }).catch(() => {});

  return { ok: true, channelId };
}
