"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/server";
import { revalidatePath } from "next/cache";
import { getSocialViewer, getViewerFollowingIds } from "@/lib/social-viewer";

/* Follow graph lives in public.connections (follower_id / following_id are
   Prisma "User".id values), accessed with the service-role client. */

export type SocialUserDTO = {
  id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  role: string;
  educationLevel: string | null;
  /** Viewer follows this user. */
  isFollowing: boolean;
  /** This user follows the viewer. */
  followsYou: boolean;
  isSelf: boolean;
};

/**
 * Idempotent follow/unfollow: sets the relationship to `follow` rather than
 * flipping it, so double taps and out-of-order responses can't desync the UI.
 */
export async function setFollow(
  targetUserId: string,
  follow: boolean,
): Promise<{ ok: true; following: boolean } | { ok: false; error: string }> {
  const viewer = await getSocialViewer();
  if (!viewer) return { ok: false, error: "Sign in to follow people." };
  if (typeof targetUserId !== "string" || !targetUserId) return { ok: false, error: "Missing user." };
  if (targetUserId === viewer.id) return { ok: false, error: "You can't follow yourself." };

  const admin = createAdminClient();
  try {
    if (!follow) {
      const { error } = await admin
        .from("connections")
        .delete()
        .eq("follower_id", viewer.id)
        .eq("following_id", targetUserId);
      if (error) throw new Error(error.message);
      revalidatePath(`/profile/${targetUserId}`);
      return { ok: true, following: false };
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) return { ok: false, error: "That account no longer exists." };

    const { error } = await admin.from("connections").insert({ follower_id: viewer.id, following_id: targetUserId });
    // 23505 = already following (double tap / second tab) — that's the state we want.
    if (error && error.code !== "23505") throw new Error(error.message);

    if (!error) {
      notifyUser(targetUserId, {
        type: "FOLLOW",
        title: `${viewer.name} started following you`,
        body: "Tap to see their profile and follow back.",
        actionUrl: `/profile/${viewer.id}`,
      }).catch(() => {});
    }
    revalidatePath(`/profile/${targetUserId}`);
    return { ok: true, following: true };
  } catch (error) {
    console.error("setFollow error:", error);
    return { ok: false, error: "We couldn't update that follow." };
  }
}

/** Back-compat toggle (throws on failure). Prefer setFollow. */
export async function toggleFollow(targetUserId: string): Promise<{ following: boolean }> {
  const viewer = await getSocialViewer();
  if (!viewer) throw new Error("Authentication required");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("id")
    .eq("follower_id", viewer.id)
    .eq("following_id", targetUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const res = await setFollow(targetUserId, !data);
  if (!res.ok) throw new Error(res.error);
  return { following: res.following };
}

export async function getFollowingIds(): Promise<string[]> {
  const viewer = await getSocialViewer();
  if (!viewer) return [];
  return getViewerFollowingIds(viewer.id);
}

/**
 * "People you may know". Candidates: people who follow you but you don't
 * follow back, people at your education level, and recently active users.
 *   score = 3·followsYou + 1.5·sameLevel + 1·activeInLast3Days
 *         + 0.5·log10(points + 1) + 0.3·(tutor shown to a student)
 */
export async function getSuggestedPeople(limit = 5): Promise<SocialUserDTO[]> {
  const viewer = await getSocialViewer();
  if (!viewer) return [];
  const take = Math.min(Math.max(Math.floor(Number(limit) || 5), 1), 12);

  try {
    const followingIds = await getViewerFollowingIds(viewer.id);
    const exclude = [...followingIds, viewer.id];

    let followerIds: string[] = [];
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("connections")
        .select("follower_id")
        .eq("following_id", viewer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      followerIds = ((data ?? []) as Array<{ follower_id: string }>).map((r) => r.follower_id);
    } catch {
      followerIds = [];
    }
    const followingSet = new Set(followingIds);
    const followBack = followerIds.filter((id) => !followingSet.has(id) && id !== viewer.id);
    const followBackSet = new Set(followBack);

    const now = Date.now();
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: exclude },
        banned: false,
        role: { in: ["STUDENT", "TUTOR"] },
        OR: [
          ...(followBack.length ? [{ id: { in: followBack } }] : []),
          ...(viewer.educationLevel ? [{ educationLevel: viewer.educationLevel }] : []),
          { lastActiveAt: { gte: new Date(now - 14 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }],
      take: 40,
      select: {
        id: true,
        name: true,
        avatar: true,
        username: true,
        role: true,
        educationLevel: true,
        points: true,
        lastActiveAt: true,
      },
    });

    const viewerRole = String(viewer.role);
    const scored = candidates.map((u) => {
      const followsYou = followBackSet.has(u.id);
      const sameLevel = !!viewer.educationLevel && u.educationLevel === viewer.educationLevel;
      const active = !!u.lastActiveAt && now - u.lastActiveAt.getTime() < 3 * 24 * 60 * 60 * 1000;
      const tutorForStudent = viewerRole === "STUDENT" && String(u.role) === "TUTOR";
      const score =
        3 * Number(followsYou) +
        1.5 * Number(sameLevel) +
        1 * Number(active) +
        0.5 * Math.log10(Math.max(0, u.points) + 1) +
        0.3 * Number(tutorForStudent);
      return { u, followsYou, score };
    });
    scored.sort((a, b) => b.score - a.score || (a.u.id < b.u.id ? -1 : 1));

    return scored.slice(0, take).map(({ u, followsYou }) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      username: u.username,
      role: String(u.role),
      educationLevel: u.educationLevel ? String(u.educationLevel) : null,
      isFollowing: false,
      followsYou,
      isSelf: false,
    }));
  } catch (error) {
    console.error("getSuggestedPeople error:", error);
    return [];
  }
}

/** The signed-in user's own social card (sidebar): real counts only. */
export async function getMySocialSummary(): Promise<{
  id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  role: string;
  postCount: number;
  followersCount: number;
  followingCount: number;
} | null> {
  const viewer = await getSocialViewer();
  if (!viewer) return null;
  try {
    const admin = createAdminClient();
    const countOf = async (column: "follower_id" | "following_id") => {
      const { count, error } = await admin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq(column, viewer.id);
      return error ? 0 : count ?? 0;
    };
    const [me, followersCount, followingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: viewer.id },
        select: { username: true, _count: { select: { feedPosts: true } } },
      }),
      countOf("following_id"),
      countOf("follower_id"),
    ]);
    return {
      id: viewer.id,
      name: viewer.name,
      avatar: viewer.avatar,
      username: me?.username ?? null,
      role: String(viewer.role),
      postCount: me?._count.feedPosts ?? 0,
      followersCount,
      followingCount,
    };
  } catch (error) {
    console.error("getMySocialSummary error:", error);
    return null;
  }
}
