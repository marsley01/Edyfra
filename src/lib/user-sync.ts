import { StreamChat } from "stream-chat";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;
export const MASH_AI_USER_ID = "mash-ai";

export interface CanonicalUserProfile {
  id: string;
  name: string;
  image: string | null;
}

let serverClient: StreamChat | null = null;

export function getServerStreamClient(): StreamChat {
  if (!serverClient) {
    if (!STREAM_KEY || !STREAM_SECRET) {
      throw new Error(
        "[user-sync] NEXT_PUBLIC_STREAM_KEY or STREAM_SECRET is not set in environment variables",
      );
    }
    serverClient = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
  }
  return serverClient;
}

/**
 * Single source of truth for a user's chat-visible profile.
 *
 * Order of resolution:
 *   1. Prisma `User` row (canonical app data — name + avatar live here once the
 *      user finishes onboarding / updates their profile).
 *   2. Supabase `user_metadata` (used as a transient fallback for users who
 *      signed in via OAuth but haven't yet been mirrored to Prisma).
 *   3. Email local-part or "User" — last-ditch default.
 *
 * Always returns a non-empty name so Stream never sees an empty string.
 */
export async function getCanonicalUserProfile(
  userId: string,
): Promise<CanonicalUserProfile | null> {
  const prismaUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatar: true },
  });

  if (prismaUser) {
    return {
      id: prismaUser.id,
      name: prismaUser.name || "User",
      image: prismaUser.avatar,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.id === userId) {
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      name: meta.name || meta.full_name || user.email?.split("@")[0] || "User",
      image: meta.avatar || null,
    };
  }

  return null;
}

/**
 * Fetches the canonical profile for a user and upserts it to Stream.
 *
 * Idempotent: re-running it for the same user just refreshes the row.
 * Failures are logged and re-thrown — the caller decides whether the failure
 * is fatal (token issuance) or non-fatal (a best-effort warm-up).
 */
export async function syncUserToStream(
  userId: string,
): Promise<CanonicalUserProfile | null> {
  const profile = await getCanonicalUserProfile(userId);
  if (!profile) {
    console.warn(`[user-sync] No canonical profile for ${userId}; skipping Stream upsert`);
    return null;
  }

  const client = getServerStreamClient();
  await client.upsertUser({
    id: profile.id,
    name: profile.name,
    image: profile.image || undefined,
    role: "user",
  });
  return profile;
}

/**
 * Batched variant for flows that need to ensure multiple users exist
 * (matchmaking, group channels). Best-effort: one user's failure does NOT
 * abort the others. Returns the profiles that were successfully synced.
 */
export async function syncUsersToStream(
  userIds: string[],
): Promise<CanonicalUserProfile[]> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const profiles = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, avatar: true },
  });

  const client = getServerStreamClient();
  const results: CanonicalUserProfile[] = [];

  for (const p of profiles) {
    try {
      await client.upsertUser({
        id: p.id,
        name: p.name || "User",
        image: p.avatar || undefined,
        role: "user",
      });
      results.push({ id: p.id, name: p.name || "User", image: p.avatar });
    } catch (err) {
      console.error(`[user-sync] upsert failed for ${p.id}:`, err);
    }
  }

  return results;
}

/**
 * Ensures the Mash AI user exists in Stream. Required for any channel that
 * lists "mash-ai" as a member — Stream rejects memberships for unknown users.
 *
 * Safe to call repeatedly; upsertUser is idempotent.
 */
export async function syncAIUserToStream(): Promise<void> {
  const client = getServerStreamClient();
  try {
    await client.upsertUser({
      id: MASH_AI_USER_ID,
      name: "Mash AI",
      role: "user",
    });
  } catch (err) {
    // mash-ai is a system user — a failure here is non-fatal
    console.warn("[user-sync] mash-ai upsert failed (non-fatal):", err);
  }
}

/**
 * Combined warm-up: the authenticated user + the Mash AI bot. Used by token
 * issuance and any server-side channel creation.
 */
export async function syncSessionParticipants(
  userId: string,
): Promise<CanonicalUserProfile | null> {
  const profile = await syncUserToStream(userId);
  await syncAIUserToStream();
  return profile;
}
