"use server";

import prisma from "@/lib/prisma";
import { EduLevel, MatchTier } from "@/generated/client";
import { SESSION_CONFIG, TUTOR_CONFIG } from "@/lib/config";
import { randomBytes } from "crypto";
import { syncUsersToStream } from "@/lib/user-sync";
import { notifyUser } from "@/app/actions/notifications";

// ─── Atomic Commit Helpers ────────────────────────────────────────────────────
// Every matching decision is committed via these helpers so that
// "create Session + update MatchRequest (+ tutor load increment)" either all
// succeed or all roll back. Without this, a client refresh or transient DB
// error between steps leaves the MatchRequest in a half-resolved state and the
// student stuck on the matching screen.

type ResolvedTier = "TUTOR" | "PEER";

interface CommitHumanMatchParams {
  matchRequestId: string;
  studentId: string;
  partnerId: string;
  subject: string;
  topic: string | null;
  tier: ResolvedTier;
}

interface CommitHumanMatchResult {
  sessionId: string;
  roomId: string;
}

export async function commitHumanMatch(
  params: CommitHumanMatchParams,
): Promise<CommitHumanMatchResult> {
  const { matchRequestId, studentId, partnerId, subject, topic, tier } = params;
  const roomId = `room-${randomBytes(8).toString("hex")}`;
  const startedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        studentId,
        partnerId,
        tier: tier as MatchTier,
        subject,
        topic,
        status: "ACTIVE",
        roomId,
        startedAt,
      },
    });

    await tx.matchRequest.update({
      where: { id: matchRequestId },
      data: {
        sessionId: session.id,
        resolvedAs: tier as MatchTier,
        resolvedAt: startedAt,
      },
    });

    if (tier === "TUTOR") {
      await tx.tutorProfile.update({
        where: { userId: partnerId },
        data: {
          currentActiveSessions: { increment: 1 },
          lastAssignedAt: startedAt,
          totalAssignmentsToday: { increment: 1 },
          sessionsAssigned: { increment: 1 },
        },
      });
    }

    return session;
  });

  return { sessionId: result.id, roomId };
}

interface CommitGroupJoinParams {
  matchRequestId: string;
  studentId: string;
  subject: string;
  groupSessionId: string;
  tutorId: string;
}

async function commitGroupJoin(
  params: CommitGroupJoinParams,
): Promise<{ sessionId: string; tutorId: string }> {
  const { matchRequestId, studentId, subject, groupSessionId, tutorId } = params;
  const resolvedAt = new Date();

  await prisma.$transaction([
    prisma.matchRequest.create({
      data: {
        studentId,
        subject,
        sessionId: groupSessionId,
        resolvedAs: "TUTOR",
        resolvedAt,
      },
    }),
    prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: {
        sessionId: groupSessionId,
        resolvedAs: "TUTOR",
        resolvedAt,
      },
    }),
  ]);

  return { sessionId: groupSessionId, tutorId };
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

    await tx.matchRequest.update({
      where: { id: matchRequestId },
      data: {
        sessionId: session.id,
        resolvedAs: "MASH",
        resolvedAt: startedAt,
      },
    });

    return session;
  });

  return { sessionId: result.id, roomId };
}

// Persist the "tier exhausted" flag atomically. Using a single update avoids
// a window where two parallel calls both see "tier not tried" and retry it.
async function markTierExhausted(
  matchRequestId: string,
  tier: 1 | 2,
): Promise<void> {
  try {
    await prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: tier === 1 ? { tier1Tried: true } : { tier2Tried: true },
    });
  } catch (err) {
    // Non-fatal — the worst case is a redundant retry of this tier next call.
    console.warn(`[match-algorithm] markTierExhausted(${tier}) failed:`, err);
  }
}

/**
 * Fetch pending match requests filtered by tutor's subjects.
 */
export async function getFilteredMatchRequests(tutorSubjects: string[]) {
  try {
    const whereClause: any = { sessionId: null };
    if (tutorSubjects.length > 0) {
      whereClause.subject = { in: tutorSubjects };
    }

    const requests = await prisma.matchRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const studentIds = Array.from(new Set(requests.map(r => r.studentId)));
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, plan: true }
    });

    const studentMap = new Map(students.map(s => [s.id, s.plan]));

    return requests.sort((a, b) => {
      const planA = (studentMap.get(a.studentId) as string) || "free";
      const planB = (studentMap.get(b.studentId) as string) || "free";
      if (planA === planB) return 0;
      return planA === "plus" ? -1 : 1;
    }).slice(0, 20);
  } catch (error) {
    console.error("Error fetching filtered match requests:", error);
    return [];
  }
}

/**
 * Find an existing active group session for this subject with a tutor.
 * Only return sessions that started less than 10 minutes ago.
 */
async function findActiveGroupSession(
  requestedSubject: string,
  educationLevel?: EduLevel | null
): Promise<{ sessionId: string; roomId: string; tutorId: string; startedAt: Date } | null> {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const session = await prisma.session.findFirst({
      where: {
        tier: "TUTOR",
        subject: requestedSubject,
        status: "ACTIVE",
        startedAt: { gte: tenMinutesAgo },
        partnerId: { not: null },
      },
      orderBy: { startedAt: "desc" },
    });

    if (session && session.partnerId) {
      // Verify the tutor is still online before adding student to group
      const tutor = await prisma.tutorProfile.findUnique({
        where: { userId: session.partnerId },
        select: { availability: true, currentActiveSessions: true, maxConcurrentSessions: true },
      });

      if (!tutor) return null;

      const availability = tutor.availability as any;
      const isOnline = availability?.isOnline === true;
      const hasCapacity = tutor.currentActiveSessions < tutor.maxConcurrentSessions;

      if (!isOnline || !hasCapacity) return null;

      return {
        sessionId: session.id,
        roomId: session.roomId,
        tutorId: session.partnerId,
        startedAt: session.startedAt!,
      };
    }
    return null;
  } catch (error) {
    console.error("Error in findActiveGroupSession:", error);
    return null;
  }
}

/**
 * TIER 1: GROUP — Try to add student to an existing active tutor session
 * Only if the session started less than 10 minutes ago.
 */
async function tryJoinGroupSession(
  studentId: string,
  matchRequestId: string,
  requestedSubject: string,
  educationLevel?: EduLevel | null
): Promise<{ sessionId: string; roomId: string; tutorId: string } | null> {
  try {
    const group = await findActiveGroupSession(requestedSubject, educationLevel);
    if (!group) return null;

    // Check if student is already in this session
    const existingMessage = await prisma.message.findFirst({
      where: { sessionId: group.sessionId, senderId: studentId },
    });
    if (existingMessage) return null;

    // Atomic: insert the "join" MatchRequest + update the original in one
    // transaction. If either fails, both roll back and the next attempt
    // sees the same pre-state.
    await commitGroupJoin({
      matchRequestId,
      studentId,
      subject: requestedSubject,
      groupSessionId: group.sessionId,
      tutorId: group.tutorId,
    });

    // Notify tutor that a student joined their group session (best-effort,
    // post-commit, since notifications are not part of the DB contract).
    try {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true },
      });
      await notifyUser(group.tutorId, {
        type: "MATCH_FOUND",
        title: "Student joined your session!",
        body: `${student?.name || "A student"} has joined your ${requestedSubject} session.`,
        actionUrl: `/study-room/${group.sessionId}`,
      });
    } catch (e) {
      console.error("Failed to notify tutor of group join:", e);
    }

    return {
      sessionId: group.sessionId,
      roomId: group.roomId,
      tutorId: group.tutorId,
    };
  } catch (error) {
    console.error("Error in tryJoinGroupSession:", error);
    return null;
  }
}

/**
 * TIER 1: TUTOR — Find eligible tutors with load balancing
 * Uses fairness score: active sessions ASC, last assigned NULLS FIRST, rating DESC, total assignments ASC
 */
export async function findTier1Match(
  studentId: string,
  requestedSubject: string,
  educationLevel?: EduLevel | null
): Promise<string | null> {
  try {
    // FIRST: Try to join an existing active group session (if started < 10 min ago)
    // This is handled in executeSmartMatching now

    // SECOND: Find an available tutor with load balancing
    const levelStr = educationLevel || "HIGH_SCHOOL";

    const tutors = await prisma.user.findMany({
      where: {
        id: { not: studentId },
        role: "TUTOR",
        tutorProfile: {
          subjects: { hasSome: [requestedSubject] },
          isVerified: true,
          levelsTaught: { has: levelStr },
        },
        sessionsAsTutor: {
          none: { status: "ACTIVE" },
        },
      },
      include: { tutorProfile: true },
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { createdAt: "asc" },
      ],
      take: 20,
    });

    // Filter by online status and load capacity
    const eligible = tutors.filter(t => {
      const tp = t.tutorProfile!;
      const availability = tp.availability as any;
      const isOnline = availability?.isOnline === true;
      const hasCapacity = tp.currentActiveSessions < tp.maxConcurrentSessions;
      return isOnline && hasCapacity;
    });

    if (eligible.length === 0) return null;

    // Sort by fairness score
    eligible.sort((a, b) => {
      const tpA = a.tutorProfile!;
      const tpB = b.tutorProfile!;

      // 1. Fewer active sessions first
      if (tpA.currentActiveSessions !== tpB.currentActiveSessions) {
        return tpA.currentActiveSessions - tpB.currentActiveSessions;
      }

      // 2. Last assigned NULLS FIRST (never assigned tutors get priority)
      const aTime = tpA.lastAssignedAt?.getTime() || 0;
      const bTime = tpB.lastAssignedAt?.getTime() || 0;
      if (!tpA.lastAssignedAt && tpB.lastAssignedAt) return -1;
      if (tpA.lastAssignedAt && !tpB.lastAssignedAt) return 1;
      if (aTime !== bTime) return aTime - bTime;

      // 3. Higher rating wins among equally available
      if (tpB.rating !== tpA.rating) return tpB.rating - tpA.rating;

      // 4. Fewer assignments today
      if (tpA.totalAssignmentsToday !== tpB.totalAssignmentsToday) {
        return tpA.totalAssignmentsToday - tpB.totalAssignmentsToday;
      }

      // 5. Random fallback to ensure we don't pick the exact same tutor every time if all else is equal
      return Math.random() - 0.5;
    });

    return eligible[0]?.id || null;
  } catch (error) {
    console.error("Error in findTier1Match:", error);
    return null;
  }
}

/**
 * Update tutor load balancing counters after session ends
 */
export async function decrementTutorActiveSessions(tutorId: string) {
  try {
    const tp = await prisma.tutorProfile.findUnique({ where: { userId: tutorId } });
    if (!tp) return;

    const newCount = Math.max(0, tp.currentActiveSessions - 1);
    await prisma.tutorProfile.update({
      where: { userId: tutorId },
      data: {
        currentActiveSessions: newCount,
        sessionsResponded: { increment: 1 },
        responseRate: newCount === 0
          ? Math.round((tp.sessionsResponded + 1) / Math.max(tp.sessionsAssigned + 1, 1) * 100)
          : tp.responseRate,
      },
    });
  } catch (error) {
    console.error("Error decrementing tutor sessions:", error);
  }
}

/**
 * TIER 2: Find peer students with same subject
 */
export async function findTier2Match(
  studentId: string,
  requestedSubjects: string[],
  educationLevel?: EduLevel | null
): Promise<string | null> {
  try {
    let peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        ...(educationLevel ? { educationLevel: educationLevel as EduLevel } : {}),
        studentProfile: {
          subjects: { hasSome: requestedSubjects },
        },
        sessionsAsStudent: { none: { status: "ACTIVE" } },
      },
      include: { studentProfile: true },
      orderBy: [
        { streakDays: "desc" },
        { points: "desc" },
        { createdAt: "asc" },
      ],
    });

    if (peer) return peer.id;

    peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        studentProfile: {
          subjects: { hasSome: requestedSubjects },
        },
        sessionsAsStudent: { none: { status: "ACTIVE" } },
      },
      include: { studentProfile: true },
      orderBy: [
        { streakDays: "desc" },
        { points: "desc" },
        { createdAt: "asc" },
      ],
    });

    if (peer) return peer.id;

    peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        sessionsAsStudent: { none: { status: "ACTIVE" } },
      },
      include: { studentProfile: true },
      orderBy: [
        { streakDays: "desc" },
        { points: "desc" },
        { createdAt: "asc" },
      ],
    });

    return peer?.id || null;
  } catch (error) {
    console.error("Error in findTier2Match:", error);
    return null;
  }
}

/**
 * TIER 3: Create an AI session (Session + MatchRequest update) atomically.
 *
 * Used by `executeSmartMatching` for the MASH fallback. Stream sync happens
 * AFTER the DB commit so a Stream failure cannot leave the DB half-written.
 */
export async function createAISession(
  matchRequestId: string,
  studentId: string,
  subject: string,
  topic?: string
): Promise<{ sessionId: string; roomId: string }> {
  const { sessionId, roomId } = await commitAISession({
    matchRequestId,
    studentId,
    subject,
    topic: topic ?? null,
  });

  try {
    await syncUsersToStream([studentId]);
  } catch {
    /* best-effort */
  }

  return { sessionId, roomId };
}

/**
 * MAIN MATCHING LOGIC
 * Step 0: Try to join existing group session (with tutor, <10 min old)
 * Step 1: Find available tutor with load balancing
 * Step 2: Find peer student
 * Step 3: Mash AI fallback
 */
export async function executeSmartMatching(
  matchRequestId: string,
  options?: { skipAI?: boolean }
): Promise<{
  success: boolean;
  partnerId?: string;
  sessionId?: string;
  roomId?: string;
  tier?: "TUTOR" | "PEER" | "MASH" | "GROUP";
  error?: string;
  debug?: {
    availableTutors: number;
    availablePeers: number;
    studentLevel: string;
    requestedSubject: string;
  };
}> {
  try {
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
    });
    if (!matchRequest) return { success: false, error: "Match request not found" };
    
    // If already matched (e.g. manually accepted by a tutor or matched in a previous check)
    // return success along with the sessionId.
    if (matchRequest.sessionId) {
      return {
        success: true,
        sessionId: matchRequest.sessionId,
        tier: matchRequest.resolvedAs || undefined,
      };
    }

    const student = await prisma.user.findUnique({
      where: { id: matchRequest.studentId },
      include: { studentProfile: true },
    });
    if (!student) return { success: false, error: "Student not found" };

    let partnerId: string | null = null;
    let tier: "TUTOR" | "PEER" | "MASH" | "GROUP" = "MASH";

    const availableTutors = await prisma.user.count({
      where: {
        id: { not: matchRequest.studentId },
        role: "TUTOR",
        tutorProfile: { subjects: { hasSome: [matchRequest.subject] } },
        sessionsAsTutor: { none: { status: "ACTIVE" } },
      },
    });

    const availablePeers = await prisma.user.count({
      where: {
        id: { not: matchRequest.studentId },
        role: "STUDENT",
        studentProfile: { subjects: { hasSome: [matchRequest.subject] } },
        sessionsAsStudent: { none: { status: "ACTIVE" } },
      },
    });

    const debugInfo = {
      availableTutors,
      availablePeers,
      studentLevel: student.educationLevel || "UNKNOWN",
      requestedSubject: matchRequest.subject,
    };

    // Stagger matching tiers based on elapsed time:
    // - TIER 1 (Tutor): 0 - 30 seconds
    // - TIER 2 (Peer): 30+ seconds
    // - TIER 3 (AI Fallback): 55+ seconds
    const elapsedMs = Date.now() - matchRequest.createdAt.getTime();
    const tryTutor = true; // Always try tutor if one is available
    const tryPeer = elapsedMs >= 30 * 1000;
    const tryAI = elapsedMs >= 55 * 1000 && !options?.skipAI;

    // ============ STEP 0: GROUP SESSION ============
    if (tryTutor) {
      const groupResult = await tryJoinGroupSession(
        matchRequest.studentId,
        matchRequestId,
        matchRequest.subject,
        student.educationLevel
      );

      if (groupResult) {
        return {
          success: true,
          partnerId: groupResult.tutorId,
          sessionId: groupResult.sessionId,
          roomId: groupResult.roomId,
          tier: "GROUP",
          debug: debugInfo,
        };
      }
    }

    // ============ STEP 1: TUTOR MATCH (Load Balanced) ============
    if (tryTutor) {
      const tier1Partner = await findTier1Match(
        matchRequest.studentId,
        matchRequest.subject,
        student.educationLevel
      );

      if (tier1Partner) {
        partnerId = tier1Partner;
        tier = "TUTOR";
      }
    }

    // ============ STEP 2: PEER MATCH ============
    if (!partnerId && tryPeer) {
      const tier2Partner = await findTier2Match(
        matchRequest.studentId,
        student.studentProfile?.subjects || [matchRequest.subject],
        student.educationLevel
      );

      if (tier2Partner) {
        partnerId = tier2Partner;
        tier = "PEER";
      }
    }

    // ============ STEP 3: AI MATCH ============
    if (!partnerId && !tryAI) {
      return { success: false, error: "Searching for human match...", debug: debugInfo };
    }

    if (!partnerId) {
      tier = "MASH";
      const aiSession = await createAISession(
        matchRequestId,
        matchRequest.studentId,
        matchRequest.subject,
        matchRequest.topic ?? undefined
      );

      return {
        success: true,
        sessionId: aiSession.sessionId,
        roomId: aiSession.roomId,
        tier: "MASH",
        debug: debugInfo,
      };
    }

    // Ensure both users exist in Stream Chat (best-effort, post-commit).
    // The DB commit is the source of truth — if Stream sync fails the
    // session is still real, just needs a token-refresh on the client.
    try {
      await syncUsersToStream([matchRequest.studentId, partnerId]);
    } catch {}

    // ============ COMMIT: create Session + update MatchRequest + tutor load ============
    const committed = await commitHumanMatch({
      matchRequestId,
      studentId: matchRequest.studentId,
      partnerId,
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      tier: tier === "TUTOR" ? "TUTOR" : "PEER",
    });

    return {
      success: true,
      partnerId,
      sessionId: committed.sessionId,
      roomId: committed.roomId,
      tier,
      debug: debugInfo,
    };
  } catch (error) {
    console.error("Error in executeSmartMatching:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      debug: { availableTutors: 0, availablePeers: 0, studentLevel: "UNKNOWN", requestedSubject: "UNKNOWN" },
    };
  }
}

/**
 * Sweep unmatched requests after timeout and convert to AI
 */
export async function sweepAndAIFallback() {
  try {
    const timeoutThreshold = new Date(Date.now() - SESSION_CONFIG.SESSION_MATCH_TIMEOUT_MS);

    const unmatchedRequests = await prisma.matchRequest.findMany({
      where: {
        sessionId: null,
        createdAt: { lt: timeoutThreshold },
      },
    });

    let converted = 0;
    for (const request of unmatchedRequests) {
      try {
        const result = await executeSmartMatching(request.id);
        if (result.success) converted++;
      } catch (err) {
        console.error(`Failed to convert request ${request.id}:`, err);
      }
    }

    return { success: true, converted, total: unmatchedRequests.length };
  } catch (error) {
    console.error("Error in sweepAndAIFallback:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
