import { cache } from "react";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Lightweight "who is looking at this?" lookup for the social surfaces
 * (feed, profiles, follow lists).
 *
 * - Resolves the PRISMA id (by auth id OR email) — older/OAuth accounts have a
 *   Prisma id that differs from their Supabase auth id, and every social table
 *   (FeedPost, PostLike, Comment, connections) references "User"(id).
 * - Unlike getUserData() it never writes (no daily reward / tier recalibration),
 *   so it is safe to call on every feed page.
 * - Memoised per request with React cache().
 */
export const getSocialViewer = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const me = await prisma.user.findFirst({
      where: { OR: [{ id: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
      select: { id: true, name: true, avatar: true, role: true, educationLevel: true, banned: true },
    });
    return me;
  } catch {
    return null;
  }
});

/** Ids the viewer follows (capped). One query against public.connections. */
export const getViewerFollowingIds = cache(async (viewerId: string): Promise<string[]> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("connections")
      .select("following_id")
      .eq("follower_id", viewerId)
      .limit(2000);
    if (error || !data) return [];
    return (data as Array<{ following_id: string }>).map((r) => r.following_id);
  } catch {
    return [];
  }
});

/** Of `candidateIds`, which ones follow `viewerId`? One batched query. */
export async function getFollowersAmong(viewerId: string, candidateIds: string[]): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("connections")
      .select("follower_id")
      .eq("following_id", viewerId)
      .in("follower_id", candidateIds);
    if (error || !data) return new Set();
    return new Set((data as Array<{ follower_id: string }>).map((r) => r.follower_id));
  } catch {
    return new Set();
  }
}
