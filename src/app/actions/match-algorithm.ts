"use server";

// Client-callable entry points into the matching engine. The engine itself
// lives in ./match-engine.ts (not a server-action module) so its id-trusting
// internals can't be invoked directly from the browser.

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import {
  getFilteredMatchRequests as getFilteredMatchRequestsInternal,
  decrementTutorActiveSessions as decrementTutorActiveSessionsInternal,
  type TutorFeedRequest,
} from "./match-engine";

async function getViewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.user.findFirst({
    where: {
      OR: [{ id: user.id }, ...(user.email ? [{ email: user.email }] : [])],
    },
    select: {
      id: true,
      role: true,
      banned: true,
      suspended: true,
      tutorProfile: { select: { subjects: true, isVerified: true } },
    },
  });
}

/** Verified, active tutor (the only role that may take live requests). */
function isVerifiedTutor(viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>): boolean {
  return viewer.role === "TUTOR" && viewer.tutorProfile?.isVerified === true;
}

/**
 * Open match requests a tutor can take, filtered by the subjects they teach
 * (taken from their own profile — the argument is only used for admins, who
 * can view the feed but not accept). Unverified (pending) tutors get nothing.
 * Requests currently offered exclusively to another tutor are hidden; offers
 * to the caller come first with `offeredToMe` set.
 */
export async function getFilteredMatchRequests(tutorSubjects: string[] = []): Promise<TutorFeedRequest[]> {
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.banned || viewer.suspended) return [];
    if (viewer.role === "TUTOR") {
      if (!isVerifiedTutor(viewer)) return [];
      const own = viewer.tutorProfile?.subjects ?? [];
      // No subjects means nothing they could accept (an empty list would
      // otherwise mean "all subjects" to the engine).
      if (own.length === 0) return [];
      return await getFilteredMatchRequestsInternal(own, viewer.id);
    }
    if (viewer.role !== "ADMIN") return [];

    const subjects = Array.isArray(tutorSubjects)
      ? tutorSubjects.filter((s) => typeof s === "string").slice(0, 50)
      : [];

    return await getFilteredMatchRequestsInternal(subjects, viewer.id);
  } catch (error) {
    console.error("Error fetching filtered match requests:", error);
    return [];
  }
}

/**
 * Who is looking at the live match toasts: only verified tutors get them
 * (null for everyone else), and only for subjects they teach.
 */
export async function getMatchViewerContext(): Promise<{ id: string; role: string; subjects: string[] } | null> {
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.banned || viewer.suspended) return null;
    if (!isVerifiedTutor(viewer)) return null;
    return { id: viewer.id, role: viewer.role, subjects: viewer.tutorProfile?.subjects ?? [] };
  } catch {
    return null;
  }
}

/**
 * Update tutor load counters after a session ends. Only the tutor themselves
 * (or an admin) may decrement their counter.
 */
export async function decrementTutorActiveSessions(tutorId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  if (viewer.id !== tutorId && viewer.role !== "ADMIN") return;
  await decrementTutorActiveSessionsInternal(tutorId);
}
