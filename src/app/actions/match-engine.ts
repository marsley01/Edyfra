// Matching engine internals. Deliberately NOT a "use server" module: every
// export here takes raw user/request ids and trusts them, so exposing them as
// server actions would let any visitor create sessions or resolve requests for
// other users. The client-callable surface lives in ./match-algorithm.ts,
// ./match.ts and ./search.ts, which authenticate first.
//
// Flow (timings in src/lib/matching/match-flow.ts):
//   request -> rank online tutors (src/lib/matching/tutor-ranking.ts)
//           -> offer to the best one, exclusively, for OFFER_TIMEOUT_MS
//           -> decline / timeout -> offer the next one
//           -> no tutor left or TUTOR_PHASE_MS passed -> pair with a live peer
//              (src/lib/matching/student-discovery.ts)
//           -> AI_FALLBACK_MS passed -> Mash AI
//           -> REQUEST_TTL_MS passed -> expired
// Every assignment is a conditional write (`sessionId IS NULL`, tutor under
// capacity) inside a transaction, so a request can never be double-assigned.

import prisma from "@/lib/prisma";
import { MatchTier, Prisma } from "@/generated/client";
import { randomBytes } from "crypto";
import { syncUsersToStream, getServerStreamClient, MASH_AI_USER_ID } from "@/lib/user-sync";
import { notifyUser } from "@/lib/notifications/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { LIVE_PEER_SEARCH_MS } from "@/lib/matching/peers";
import {
  MATCH_TIMINGS,
  canAccept,
  decideNextOffer,
  isOfferActive,
  isOpenForTutors,
  matchPhase,
  TUTOR_GRACE_MS,
  offerStats,
  type MatchPhase,
  type OfferRow,
  type OfferStatus,
} from "@/lib/matching/match-flow";
import {
  rankTutors,
  teachesSubject,
  type TutorCandidate,
  type TutorSlot,
} from "@/lib/matching/tutor-ranking";
import { rankPeers, type StudentLike } from "@/lib/matching/student-discovery";
import { subjectKeySet } from "@/lib/matching/normalize";

// ─── Offers (public.match_offers via service role) ───────────────────────────
// Returns null when the table isn't there yet (migration
// 20261008010000_match_offers.sql not applied): callers then fall back to the
// open feed where any tutor may accept.

interface OfferDbRow {
  id: string;
  match_request_id: string;
  tutor_id: string;
  status: OfferStatus;
  expires_at: string;
}

function toOffer(r: OfferDbRow): OfferRow & { requestId: string } {
  return { id: r.id, requestId: r.match_request_id, tutorId: r.tutor_id, status: r.status, expiresAt: new Date(r.expires_at) };
}

function offersClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function fetchOffers(requestIds: string[]): Promise<(OfferRow & { requestId: string })[] | null> {
  if (requestIds.length === 0) return [];
  const db = offersClient();
  if (!db) return null;
  const { data, error } = await db
    .from("match_offers")
    .select("id, match_request_id, tutor_id, status, expires_at")
    .in("match_request_id", requestIds);
  if (error) {
    console.warn("[match-engine] match_offers unavailable:", error.message);
    return null;
  }
  return (data as OfferDbRow[]).map(toOffer);
}

async function setOfferStatus(ids: string[], status: OfferStatus, onlyIfPending = true): Promise<void> {
  if (ids.length === 0) return;
  const db = offersClient();
  if (!db) return;
  let q = db.from("match_offers").update({ status, responded_at: new Date().toISOString() }).in("id", ids);
  if (onlyIfPending) q = q.eq("status", "PENDING");
  const { error } = await q;
  if (error) console.warn("[match-engine] setOfferStatus failed:", error.message);
}

/** Close any pending offers on these requests (resolved some other way). */
export async function withdrawPendingOffers(requestIds: string[]): Promise<void> {
  if (requestIds.length === 0) return;
  const db = offersClient();
  if (!db) return;
  const { error } = await db
    .from("match_offers")
    .update({ status: "WITHDRAWN", responded_at: new Date().toISOString() })
    .in("match_request_id", requestIds)
    .eq("status", "PENDING");
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    console.warn("[match-engine] withdrawPendingOffers failed:", error.message);
  }
}

/** Insert an offer. False when another poller created one first (unique pending index). */
async function createOffer(requestId: string, tutorId: string, score: number, expiresAt: Date): Promise<boolean> {
  const db = offersClient();
  if (!db) return false;
  const { error } = await db.from("match_offers").insert({
    match_request_id: requestId,
    tutor_id: tutorId,
    status: "PENDING",
    score,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    if (error.code !== "23505") console.warn("[match-engine] createOffer failed:", error.message);
    return false;
  }
  return true;
}

// ─── Atomic commit helpers ───────────────────────────────────────────────────

type ResolvedTier = "TUTOR" | "PEER";

interface CommitHumanMatchParams {
  matchRequestId: string;
  studentId: string;
  partnerId: string;
  subject: string;
  topic: string | null;
  tier: ResolvedTier;
  partnerMatchRequestId?: string;
}

export class MatchConflictError extends Error {
  constructor(public reason: "already_resolved" | "peer_resolved" | "tutor_at_capacity") {
    super(
      reason === "tutor_at_capacity"
        ? "Tutor is at capacity"
        : reason === "peer_resolved"
          ? "Peer match request already resolved"
          : "Match request already resolved",
    );
  }
}

export async function commitHumanMatch(
  params: CommitHumanMatchParams,
): Promise<{ sessionId: string; roomId: string }> {
  const { matchRequestId, studentId, partnerId, subject, topic, tier, partnerMatchRequestId } = params;
  const roomId = `room-${randomBytes(8).toString("hex")}`;
  const startedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: { studentId, partnerId, tier: tier as MatchTier, subject, topic, status: "ACTIVE", roomId, startedAt },
    });

    const claimed = await tx.matchRequest.updateMany({
      where: { id: matchRequestId, sessionId: null },
      data: { sessionId: session.id, resolvedAs: tier as MatchTier, resolvedAt: startedAt },
    });
    if (claimed.count !== 1) throw new MatchConflictError("already_resolved");

    if (partnerMatchRequestId) {
      const partnerClaimed = await tx.matchRequest.updateMany({
        where: { id: partnerMatchRequestId, sessionId: null },
        data: { sessionId: session.id, resolvedAs: tier as MatchTier, resolvedAt: startedAt },
      });
      if (partnerClaimed.count !== 1) throw new MatchConflictError("peer_resolved");
    }

    if (tier === "TUTOR") {
      // Conditional increment: two simultaneous accepts can't push a tutor
      // past maxConcurrentSessions.
      const loaded = await tx.tutorProfile.updateMany({
        where: {
          userId: partnerId,
          currentActiveSessions: { lt: prisma.tutorProfile.fields.maxConcurrentSessions },
        },
        data: {
          currentActiveSessions: { increment: 1 },
          lastAssignedAt: startedAt,
          totalAssignmentsToday: { increment: 1 },
          sessionsAssigned: { increment: 1 },
        },
      });
      if (loaded.count !== 1) throw new MatchConflictError("tutor_at_capacity");
    }

    return session;
  });

  // Pre-create the Stream Chat channel (server admin client bypasses role checks).
  try {
    const streamClient = getServerStreamClient();
    if (streamClient) {
      const channel = streamClient.channel("messaging", result.id, {
        members: [studentId, partnerId, MASH_AI_USER_ID],
        created_by_id: studentId,
      } as any);
      await channel.create();
    }
  } catch (e) {
    console.warn("[commitHumanMatch] Stream channel creation failed (non-fatal):", e);
  }

  await withdrawPendingOffers(partnerMatchRequestId ? [matchRequestId, partnerMatchRequestId] : [matchRequestId]);
  return { sessionId: result.id, roomId };
}

interface CommitAISessionParams {
  matchRequestId: string;
  studentId: string;
  subject: string;
  topic: string | null;
}

export async function commitAISession(
  params: CommitAISessionParams,
): Promise<{ sessionId: string; roomId: string }> {
  const { matchRequestId, studentId, subject, topic } = params;
  const roomId = `mash-${randomBytes(8).toString("hex")}`;
  const startedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        studentId,
        partnerId: null,
        tier: "MASH",
        subject,
        topic: topic || "General Discussion",
        status: "ACTIVE",
        roomId,
        startedAt,
      },
    });
    // Conditional: never overwrite a human match that landed a moment earlier.
    const claimed = await tx.matchRequest.updateMany({
      where: { id: matchRequestId, sessionId: null },
      data: { sessionId: session.id, resolvedAs: "MASH", resolvedAt: startedAt },
    });
    if (claimed.count !== 1) throw new MatchConflictError("already_resolved");
    return session;
  });

  try {
    const streamClient = getServerStreamClient();
    if (streamClient) {
      const channel = streamClient.channel("messaging", result.id, {
        members: [studentId, MASH_AI_USER_ID],
        created_by_id: studentId,
      } as any);
      await channel.create();
    }
  } catch (e) {
    console.warn("[commitAISession] Stream channel creation failed (non-fatal):", e);
  }

  await withdrawPendingOffers([matchRequestId]);
  return { sessionId: result.id, roomId };
}

export async function createAISession(
  matchRequestId: string,
  studentId: string,
  subject: string,
  topic?: string,
): Promise<{ sessionId: string; roomId: string }> {
  const out = await commitAISession({ matchRequestId, studentId, subject, topic: topic ?? null });
  try {
    await syncUsersToStream([studentId]);
  } catch {
    /* best-effort */
  }
  return out;
}

// ─── Tutor candidates ────────────────────────────────────────────────────────

export interface LoadedTutor extends TutorCandidate {
  name: string;
  username: string | null;
  avatar: string | null;
  bio: string;
  isVerified: boolean;
  slotsRaw: (TutorSlot & { isRecurring: boolean; specificDate: Date | null })[];
}

/**
 * Load verified, non-banned tutors with everything the ranking needs:
 * review aggregates, completed-session counts and offer acceptance history.
 */
export async function loadTutorCandidates(opts: {
  onlineOnly?: boolean;
  excludeIds?: string[];
  subject?: string | null;
  take?: number;
} = {}): Promise<LoadedTutor[]> {
  const where: Prisma.UserWhereInput = {
    role: "TUTOR",
    banned: false,
    suspended: false,
    ...(opts.excludeIds?.length ? { id: { notIn: opts.excludeIds } } : {}),
    tutorProfile: {
      isVerified: true,
      ...(opts.onlineOnly ? { availability: { path: ["isOnline"], equals: true } } : {}),
    },
  };

  const users = await prisma.user.findMany({
    where,
    take: opts.take ?? 300,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      county: true,
      curriculum: true,
      tutorProfile: {
        select: {
          subjects: true,
          levelsTaught: true,
          bio: true,
          hourlyRate: true,
          isVerified: true,
          availability: true,
          currentActiveSessions: true,
          maxConcurrentSessions: true,
          lastAssignedAt: true,
        },
      },
      tutorAvailabilities: {
        select: { dayOfWeek: true, startTime: true, endTime: true, isBlocked: true, isRecurring: true, specificDate: true },
      },
    },
  });

  const filtered = users.filter(
    (u) => u.tutorProfile && (!opts.subject || teachesSubject(u.tutorProfile.subjects, opts.subject)),
  );
  const ids = filtered.map((u) => u.id);
  if (ids.length === 0) return [];

  const [reviews, completed, offers] = await Promise.all([
    prisma.review.groupBy({
      by: ["revieweeId"],
      where: { revieweeId: { in: ids } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: ids }, status: "COMPLETED", tier: "TUTOR" },
      _count: { _all: true },
    }),
    loadOfferHistory(ids),
  ]);
  const reviewMap = new Map(reviews.map((r) => [r.revieweeId, r]));
  const completedMap = new Map(completed.map((c) => [c.partnerId as string, c._count._all]));

  return filtered.map((u) => {
    const tp = u.tutorProfile!;
    const r = reviewMap.get(u.id);
    const o = offers.get(u.id);
    const availability = (tp.availability ?? {}) as { isOnline?: unknown };
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      bio: tp.bio,
      isVerified: tp.isVerified,
      subjects: tp.subjects,
      levelsTaught: tp.levelsTaught,
      curriculum: u.curriculum,
      avgRating: r?._avg.rating ?? null,
      reviewCount: r?._count._all ?? 0,
      completedSessions: completedMap.get(u.id) ?? 0,
      offersAccepted: o?.accepted ?? null,
      offersMade: o?.made ?? null,
      isOnline: availability.isOnline === true,
      slots: u.tutorAvailabilities.filter((s) => s.isRecurring),
      slotsRaw: u.tutorAvailabilities,
      activeSessions: tp.currentActiveSessions,
      maxConcurrentSessions: tp.maxConcurrentSessions,
      county: u.county,
      hourlyRate: tp.hourlyRate,
      lastAssignedAt: tp.lastAssignedAt,
    };
  });
}

async function loadOfferHistory(tutorIds: string[]): Promise<Map<string, { made: number; accepted: number }>> {
  const db = offersClient();
  if (!db || tutorIds.length === 0) return new Map();
  const since = new Date(Date.now() - 60 * 24 * 3_600_000).toISOString();
  const { data, error } = await db
    .from("match_offers")
    .select("tutor_id, status")
    .in("tutor_id", tutorIds)
    .gte("offered_at", since)
    .limit(5000);
  if (error || !data) return new Map();
  return offerStats((data as { tutor_id: string; status: OfferStatus }[]).map((r) => ({ tutorId: r.tutor_id, status: r.status })));
}

// ─── Tutor feed ──────────────────────────────────────────────────────────────

export interface TutorFeedRequest {
  id: string;
  subject: string;
  topic: string | null;
  createdAt: Date;
  sessionId: string | null;
  studentFirstName: string;
  studentLevel: string | null;
  offeredToMe: boolean;
  offerExpiresAt: string | null;
}

/**
 * Open requests a tutor can act on: unresolved, still being polled by their
 * student (younger than AI_FALLBACK_MS + grace, see isOpenForTutors), in a subject they
 * teach (case/alias-insensitive), not the tutor's own, and not currently
 * offered exclusively to a different tutor. Offers to this tutor come first.
 */
export async function getFilteredMatchRequests(
  tutorSubjects: string[],
  viewerId?: string,
): Promise<TutorFeedRequest[]> {
  try {
    const now = new Date();
    const requests = await prisma.matchRequest.findMany({
      where: {
        sessionId: null,
        createdAt: { gte: new Date(now.getTime() - MATCH_TIMINGS.AI_FALLBACK_MS - TUTOR_GRACE_MS) },
        ...(viewerId ? { studentId: { not: viewerId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        subject: true,
        topic: true,
        createdAt: true,
        sessionId: true,
        student: { select: { name: true, plan: true, educationLevel: true, banned: true, suspended: true } },
      },
    });

    const wanted = subjectKeySet(tutorSubjects);
    const relevant = requests.filter(
      (r) => !r.student.banned && !r.student.suspended && (wanted.size === 0 || teachesSubject(tutorSubjects, r.subject)),
    );

    const offers = (await fetchOffers(relevant.map((r) => r.id))) ?? [];
    const activeByRequest = new Map(offers.filter((o) => isOfferActive(o, now)).map((o) => [o.requestId, o]));

    const rows = relevant
      .filter((r) => {
        const active = activeByRequest.get(r.id);
        return !active || active.tutorId === viewerId;
      })
      .map((r) => {
        const active = activeByRequest.get(r.id);
        return {
          row: {
            id: r.id,
            subject: r.subject,
            topic: r.topic,
            createdAt: r.createdAt,
            sessionId: r.sessionId,
            studentFirstName: (r.student.name || "A student").split(" ")[0],
            studentLevel: r.student.educationLevel ?? null,
            offeredToMe: !!active && active.tutorId === viewerId,
            offerExpiresAt: active ? active.expiresAt.toISOString() : null,
          } satisfies TutorFeedRequest,
          plus: r.student.plan === "plus",
        };
      });

    rows.sort((a, b) => {
      if (a.row.offeredToMe !== b.row.offeredToMe) return a.row.offeredToMe ? -1 : 1;
      if (a.plus !== b.plus) return a.plus ? -1 : 1;
      return b.row.createdAt.getTime() - a.row.createdAt.getTime();
    });
    return rows.slice(0, 20).map((r) => r.row);
  } catch (error) {
    console.error("Error fetching filtered match requests:", error);
    return [];
  }
}

// ─── Accept / decline ────────────────────────────────────────────────────────

export type AcceptResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

/**
 * Accept a request as `acceptorId` (already authenticated by the caller).
 * Only verified tutors who teach the request's subject may accept; peer
 * pairing is done by the engine itself (tryPairWithLivePeer), never by
 * claiming a stranger's request id from the public broadcast.
 */
export async function acceptRequestAs(requestId: string, acceptorId: string): Promise<AcceptResult> {
  const now = new Date();
  const [request, acceptor] = await Promise.all([
    prisma.matchRequest.findUnique({ where: { id: requestId } }),
    prisma.user.findUnique({
      where: { id: acceptorId },
      select: {
        id: true,
        name: true,
        role: true,
        banned: true,
        suspended: true,
        tutorProfile: { select: { isVerified: true, subjects: true } },
      },
    }),
  ]);
  if (!acceptor || acceptor.banned || acceptor.suspended) {
    return { success: false, error: "Your account can't accept matches right now." };
  }
  if (acceptor.role !== "TUTOR" || !acceptor.tutorProfile) {
    return { success: false, error: "Only tutors can accept match requests." };
  }
  if (!acceptor.tutorProfile.isVerified) {
    return { success: false, error: "Your tutor profile is still being verified. You can accept requests once it's approved." };
  }
  if (!request || request.sessionId) return { success: false, error: "Match request no longer available." };
  if (request.studentId === acceptorId) return { success: false, error: "You can't accept your own request." };
  if (!teachesSubject(acceptor.tutorProfile.subjects, request.subject)) {
    return { success: false, error: "This request is for a subject you don't teach." };
  }
  if (!isOpenForTutors(request.createdAt, now)) {
    // The student stopped waiting (they'd have moved to Mash AI by now).
    return { success: false, error: "This student is no longer waiting. Pick a newer request." };
  }

  const offers = await fetchOffers([requestId]);
  const gate = offers ? canAccept(offers, acceptorId, now) : ({ ok: true, offerId: null } as const);
  if (!gate.ok) {
    return { success: false, error: "This request is being offered to another tutor. Try again in a few seconds." };
  }

  const tier: ResolvedTier = "TUTOR";
  try {
    await syncUsersToStream([request.studentId, acceptorId]);
  } catch {
    /* best-effort */
  }

  let sessionId: string;
  try {
    const committed = await commitHumanMatch({
      matchRequestId: requestId,
      studentId: request.studentId,
      partnerId: acceptorId,
      subject: request.subject,
      topic: request.topic,
      tier,
    });
    sessionId = committed.sessionId;
  } catch (error: any) {
    if (error instanceof MatchConflictError) {
      return {
        success: false,
        error:
          error.reason === "tutor_at_capacity"
            ? "You're at your session limit. Finish a session first."
            : "Someone else already took this request.",
      };
    }
    if (error?.code === "P2003") {
      await prisma.matchRequest.deleteMany({ where: { id: requestId, sessionId: null } });
      return { success: false, error: "This student is no longer available. Request removed from feed." };
    }
    console.error("[acceptRequestAs] commit failed:", error);
    return { success: false, error: "Failed to create session. Please try again." };
  }

  if (gate.offerId) await setOfferStatus([gate.offerId], "ACCEPTED", false);

  try {
    await notifyUser(request.studentId, {
      type: "MATCH_FOUND",
      title: "Help is here!",
      body: `${acceptor.name || "A tutor"} accepted your ${request.subject} request. Entering room...`,
      actionUrl: `/study-room/${sessionId}`,
    });
  } catch (e) {
    console.error("Failed to notify student:", e);
  }
  return { success: true, sessionId };
}

/** Tutor declines the offer they hold for this request; the next tutor is offered on the student's next poll. */
export async function declineOfferAs(requestId: string, tutorId: string): Promise<{ success: boolean }> {
  const db = offersClient();
  if (!db) return { success: false };
  const { error } = await db
    .from("match_offers")
    .update({ status: "DECLINED", responded_at: new Date().toISOString() })
    .eq("match_request_id", requestId)
    .eq("tutor_id", tutorId)
    .eq("status", "PENDING");
  return { success: !error };
}

// ─── Main state machine ──────────────────────────────────────────────────────

export interface MatchProgress {
  success: boolean;
  sessionId?: string;
  roomId?: string;
  partnerId?: string;
  tier?: "TUTOR" | "PEER" | "MASH";
  /** Phase the request is in now (for the UI). */
  phase?: MatchPhase;
  /** A tutor currently holds an exclusive offer until this time. */
  offerExpiresAt?: string | null;
  /** The session already existed before this call (no new notification needed). */
  alreadyResolved?: boolean;
  /** Request is gone (cancelled/expired) — the UI should stop polling. */
  gone?: boolean;
  error?: string;
}

/**
 * Advance one request by one step. Idempotent and safe to call concurrently
 * (the student's poll, the 65s fallback timer and the sweep may overlap).
 */
export async function executeSmartMatching(
  matchRequestId: string,
  options?: { skipAI?: boolean },
): Promise<MatchProgress> {
  try {
    const now = new Date();
    const request = await prisma.matchRequest.findUnique({ where: { id: matchRequestId } });
    if (!request) return { success: false, gone: true, error: "Match request not found" };

    if (request.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: request.sessionId },
        select: { roomId: true, partnerId: true, tier: true },
      });
      return {
        success: true,
        alreadyResolved: true,
        sessionId: request.sessionId,
        roomId: session?.roomId,
        partnerId: session?.partnerId ?? undefined,
        tier: (request.resolvedAs ?? session?.tier) || undefined,
      };
    }

    const phase = matchPhase(request.createdAt, now);
    if (phase === "expired") {
      await withdrawPendingOffers([request.id]);
      return { success: false, gone: true, phase, error: "This request expired. Start a new one." };
    }

    const student = await prisma.user.findUnique({
      where: { id: request.studentId },
      select: {
        id: true,
        educationLevel: true,
        formYear: true,
        curriculum: true,
        county: true,
        lastActiveAt: true,
        studentProfile: { select: { subjects: true, formLevel: true } },
      },
    });
    if (!student) return { success: false, gone: true, error: "Student not found" };

    // ── Tutor phase: exclusive offers, best-ranked first ──
    let tutorsExhausted = phase !== "tutor";
    let offerExpiresAt: string | null = null;
    if (phase === "tutor") {
      const offers = await fetchOffers([request.id]);
      if (offers === null) {
        // Offers table missing: open feed only (tutors accept from /tutor/requests).
        return { success: false, phase, error: "Searching for a tutor..." };
      }
      const active = offers.find((o) => isOfferActive(o, now));
      if (active) {
        return { success: false, phase, offerExpiresAt: active.expiresAt.toISOString(), error: "Waiting for a tutor to respond..." };
      }

      const tutors = await loadTutorCandidates({
        onlineOnly: true,
        excludeIds: [student.id],
        subject: request.subject,
      });
      const ranked = rankTutors(tutors, {
        subjects: [request.subject],
        level: student.educationLevel,
        curriculum: student.curriculum,
        county: student.county,
        requireAvailableNow: true,
        excludeIds: [student.id],
      });
      const decision = decideNextOffer(offers, ranked.map((r) => r.id), now);
      await setOfferStatus(decision.expire, "EXPIRED");

      if (decision.kind === "offer") {
        const expiresAt = new Date(now.getTime() + MATCH_TIMINGS.OFFER_TIMEOUT_MS);
        const score = ranked.find((r) => r.id === decision.tutorId)?.score ?? 0;
        const created = await createOffer(request.id, decision.tutorId, score, expiresAt);
        if (created) {
          try {
            await notifyUser(decision.tutorId, {
              type: "MATCH_OFFER",
              title: `${request.subject} student needs you now`,
              body: `${request.topic ? `"${request.topic}" — ` : ""}accept within ${Math.round(MATCH_TIMINGS.OFFER_TIMEOUT_MS / 1000)}s or it goes to the next tutor.`,
              actionUrl: "/tutor/requests",
            });
          } catch (e) {
            console.warn("[match-engine] offer notification failed:", e);
          }
          offerExpiresAt = expiresAt.toISOString();
        }
        return { success: false, phase, offerExpiresAt, error: "Waiting for a tutor to respond..." };
      }
      if (decision.kind === "wait") {
        return { success: false, phase, offerExpiresAt: decision.offer.expiresAt.toISOString(), error: "Waiting for a tutor to respond..." };
      }
      tutorsExhausted = true; // nobody (left) to offer: go straight to peers
    }

    // ── Peer phase: pair with another student who is searching right now ──
    if (tutorsExhausted && phase !== "ai") {
      const peer = await tryPairWithLivePeer(request, student, now);
      if (peer) return peer;
    }

    // ── AI fallback ──
    if (phase === "ai" && !options?.skipAI) {
      // Last chance for a human before Mash takes over.
      const peer = await tryPairWithLivePeer(request, student, now);
      if (peer) return peer;
      try {
        const ai = await createAISession(request.id, request.studentId, request.subject, request.topic ?? undefined);
        return { success: true, sessionId: ai.sessionId, roomId: ai.roomId, tier: "MASH", phase };
      } catch (e) {
        if (e instanceof MatchConflictError) return executeSmartMatching(matchRequestId, options);
        throw e;
      }
    }

    return {
      success: false,
      phase: phase === "tutor" ? "peer" : phase,
      error: "Searching for a study partner...",
    };
  } catch (error) {
    console.error("Error in executeSmartMatching:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function tryPairWithLivePeer(
  request: { id: string; studentId: string; subject: string; topic: string | null },
  student: {
    id: string;
    educationLevel: string | null;
    formYear: number | null;
    county: string;
    lastActiveAt: Date | null;
    studentProfile: { subjects: string[]; formLevel: string | null } | null;
  },
  now: Date,
): Promise<MatchProgress | null> {
  // Live = still searching, past their own tutor phase (so we don't steal a
  // student who might still get a tutor), and recent enough to be polling.
  const pending = await prisma.matchRequest.findMany({
    where: {
      sessionId: null,
      id: { not: request.id },
      studentId: { not: request.studentId },
      createdAt: {
        gte: new Date(now.getTime() - LIVE_PEER_SEARCH_MS),
        lte: new Date(now.getTime() - MATCH_TIMINGS.TUTOR_PHASE_MS),
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      subject: true,
      studentId: true,
      student: {
        select: {
          role: true,
          banned: true,
          suspended: true,
          educationLevel: true,
          formYear: true,
          county: true,
          lastActiveAt: true,
          studentProfile: { select: { subjects: true, formLevel: true } },
        },
      },
    },
  });
  const usable = pending.filter((p) => !p.student.banned && !p.student.suspended && p.student.role === "STUDENT");
  if (usable.length === 0) return null;

  const viewer: StudentLike = {
    id: student.id,
    subjects: [request.subject, ...(student.studentProfile?.subjects ?? [])],
    educationLevel: student.educationLevel,
    form: student.studentProfile?.formLevel ?? student.formYear,
    county: student.county,
    lastActiveAt: student.lastActiveAt,
  };
  const toLike = (p: (typeof usable)[number], subjects: string[]): StudentLike & { requestId: string } => ({
    id: p.studentId,
    requestId: p.id,
    subjects,
    educationLevel: p.student.educationLevel,
    form: p.student.studentProfile?.formLevel ?? p.student.formYear,
    county: p.student.county,
    // They are polling right now; their request time is the freshest signal.
    lastActiveAt: now,
  });

  // Same subject first; then peers who list this subject among theirs.
  const exact = rankPeers(viewer, usable.map((p) => toLike(p, [p.subject])), now, { requiredSubject: request.subject });
  const related = rankPeers(
    viewer,
    usable.map((p) => toLike(p, [p.subject, ...(p.student.studentProfile?.subjects ?? [])])),
    now,
    { requiredSubject: request.subject },
  );
  const order: string[] = [];
  for (const r of [...exact, ...related]) if (!order.includes(r.id)) order.push(r.id);

  for (const peerStudentId of order.slice(0, 5)) {
    const peerReq = usable.find((p) => p.studentId === peerStudentId)!;
    try {
      try {
        await syncUsersToStream([request.studentId, peerStudentId]);
      } catch {
        /* best-effort */
      }
      const committed = await commitHumanMatch({
        matchRequestId: request.id,
        studentId: request.studentId,
        partnerId: peerStudentId,
        subject: request.subject,
        topic: request.topic,
        tier: "PEER",
        partnerMatchRequestId: peerReq.id,
      });
      try {
        await notifyUser(peerStudentId, {
          type: "MATCH_FOUND",
          title: "Study partner found!",
          body: `You've been paired with another ${request.subject} student. Entering room...`,
          actionUrl: `/study-room/${committed.sessionId}`,
        });
      } catch {
        /* best-effort */
      }
      return {
        success: true,
        sessionId: committed.sessionId,
        roomId: committed.roomId,
        partnerId: peerStudentId,
        tier: "PEER",
        phase: "peer",
      };
    } catch (e) {
      if (e instanceof MatchConflictError && e.reason === "already_resolved") {
        // Our own request got resolved concurrently — report that instead.
        return null;
      }
      // Peer got taken by someone else; try the next one.
    }
  }
  return null;
}

/**
 * Update tutor load counters after a TUTOR session ends.
 */
export async function decrementTutorActiveSessions(tutorId: string) {
  try {
    // Conditional decrement: never below zero, even with concurrent completes.
    await prisma.tutorProfile.updateMany({
      where: { userId: tutorId, currentActiveSessions: { gt: 0 } },
      data: { currentActiveSessions: { decrement: 1 }, sessionsResponded: { increment: 1 } },
    });
  } catch (error) {
    console.error("Error decrementing tutor sessions:", error);
  }
}

/**
 * Housekeeping: close offers on expired requests and delete requests nobody is
 * waiting on any more (older than REQUEST_TTL_MS and never resolved). Live
 * requests are advanced by their own student's poll, not here — the sweep used
 * to push other students' requests into AI sessions they never opened.
 */
export async function sweepAndAIFallback() {
  try {
    const cutoff = new Date(Date.now() - MATCH_TIMINGS.REQUEST_TTL_MS);
    const stale = await prisma.matchRequest.findMany({
      where: { sessionId: null, createdAt: { lt: cutoff } },
      select: { id: true },
      take: 500,
    });
    const ids = stale.map((s) => s.id);
    await withdrawPendingOffers(ids);
    const removed = ids.length
      ? await prisma.matchRequest.deleteMany({ where: { id: { in: ids }, sessionId: null } })
      : { count: 0 };
    return { success: true, expired: removed.count, total: ids.length };
  } catch (error) {
    console.error("Error in sweepAndAIFallback:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
