// ============================================
// EDYFRA SMART MATCHING ALGORITHM
// Tier 1: High-rated tutors
// Tier 2: Peer students  
// Tier 3: Mash AI
// ============================================

"use server";

import prisma from "@/lib/prisma";
import { EduLevel } from "@/generated/client";
import { SESSION_CONFIG } from "@/lib/config";
import { randomBytes } from "crypto";
import { StreamChat } from "stream-chat";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

async function upsertStreamUsers(users: { id: string; name: string; image?: string | null }[]) {
  try {
    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
    for (const u of users) {
      await client.upsertUser({ id: u.id, name: u.name, image: u.image || undefined });
    }
  } catch (err) {
    console.error("Failed to upsert Stream users:", err);
  }
}

/**
 * Fetch pending match requests filtered by tutor's subjects.
 * Returns requests that haven't been matched yet.
 */
export async function getFilteredMatchRequests(tutorSubjects: string[]) {
  try {
    const whereClause: any = {
      sessionId: null,
    };

    // Only filter by subject if tutor has subjects configured
    if (tutorSubjects.length > 0) {
      whereClause.subject = { in: tutorSubjects };
    }

    const requests = await prisma.matchRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Fetch a larger batch to allow for sorting
    });

    // Fetch plans separately to avoid relation typing issues
    const studentIds = Array.from(new Set(requests.map(r => r.studentId)));
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, plan: true }
    });

    const studentMap = new Map(students.map(s => [s.id, s.plan]));

    // Sort by plan (plus first)
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
 * TIER 1: Find high-rated tutors teaching student's needed subject
 * Filters by:
 * - Subject match with student's requested subject
 * - High rating (sorted DESC)
 * - Online status
 * - Not in active session
 * - Prevents self-match
 */
export async function findTier1Match(
  studentId: string,
  requestedSubject: string,
  educationLevel?: EduLevel | null
): Promise<string | null> {
  try {
    // First try: Strict matching (verified, online, exact subject)
    let tutor = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "TUTOR",
        ...(educationLevel ? { educationLevel: educationLevel as EduLevel } : {}),
        tutorProfile: {
          subjects: { hasSome: [requestedSubject] },
          isVerified: true,
          ...(educationLevel ? { levelsTaught: { has: educationLevel } } : {}),
        },
        // Not in active session
        sessionsAsTutor: { none: { status: "ACTIVE" } },
      },
      include: { tutorProfile: true },
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { createdAt: "asc" }, // Tiebreaker: older first
      ],
    });

    if (tutor) {
      // Check online status
      const availability = tutor.tutorProfile?.availability;
      const isOnline = typeof availability === 'object' && availability !== null 
        ? (availability as { isOnline?: boolean }).isOnline 
        : false;
      if (isOnline) return tutor.id;
    }

    // Second try: More flexible - include unverified tutors, ignore online status
    tutor = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "TUTOR",
        tutorProfile: {
          subjects: { hasSome: [requestedSubject] },
          // Remove isVerified requirement to increase pool
          // Remove online status requirement
        },
        // Not in active session
        sessionsAsTutor: { none: { status: "ACTIVE" } },
      },
      include: { tutorProfile: true },
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { createdAt: "asc" },
      ],
    });

    return tutor?.id || null;
  } catch (error) {
    console.error("Error in findTier1Match:", error);
    return null;
  }
}

/**
 * TIER 2: Find peer students with same subject intersection
 * Filters by:
 * - Same education level
 * - Overlapping subjects with student
 * - Not in active session
 * - High streak/points (to recommend engaged students)
 * - Prevents self-match
 */
export async function findTier2Match(
  studentId: string,
  requestedSubjects: string[],
  educationLevel?: EduLevel | null
): Promise<string | null> {
  try {
    // First try: Strict matching (same education level, overlapping subjects)
    let peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        ...(educationLevel ? { educationLevel: educationLevel as EduLevel } : {}),
        studentProfile: {
          subjects: { hasSome: requestedSubjects },
        },
        // Not in active session
        sessionsAsStudent: { none: { status: "ACTIVE" } },
      },
      include: { studentProfile: true },
      orderBy: [
        { streakDays: "desc" }, // Engaged streaks first
        { points: "desc" }, // Then by points
        { createdAt: "asc" }, // Tiebreaker
      ],
    });

    if (peer) return peer.id;

    // Second try: More flexible - ignore education level, relax subject requirements
    peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        // Remove education level filter to increase pool
        studentProfile: {
          subjects: { hasSome: requestedSubjects },
        },
        // Not in active session
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

    // Third try: Most flexible - any student peer (even without subject overlap)
    peer = await prisma.user.findFirst({
      where: {
        id: { not: studentId },
        role: "STUDENT",
        // Remove subject requirement entirely
        // Not in active session
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
 * TIER 3: Create AI session for student
 * Always succeeds - fallback when no human match found
 */
export async function createAISession(
  studentId: string,
  subject: string,
  topic?: string
): Promise<{ sessionId: string; roomId: string }> {
  try {
    const roomId = `mash-${randomBytes(8).toString("hex")}`;

    // Upsert student to Stream Chat
    try {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true, avatar: true } });
      if (student) await upsertStreamUsers([{ id: studentId, name: student.name, image: student.avatar }]);
    } catch {}

    const session = await prisma.session.create({
      data: {
        studentId,
        partnerId: null, // AI session - no human partner
        tier: "MASH",
        subject,
        topic: topic || "General Discussion",
        status: "ACTIVE",
        roomId,
        startedAt: new Date(),
      },
    });

    return { sessionId: session.id, roomId };
  } catch (error) {
    console.error("Error creating AI session:", error);
    throw new Error("Failed to create AI session");
  }
}

/**
 * MAIN MATCHING LOGIC
 * Attempts tier1 → tier2 → tier3 sequentially
 * Uses matchRequest.tier1Tried and tier2Tried to track attempts
 * Updates matchRequest with result
 */
export async function executeSmartMatching(
  matchRequestId: string,
  options?: { skipAI?: boolean }
): Promise<{
  success: boolean;
  partnerId?: string;
  sessionId?: string;
  roomId?: string;
  tier?: "TUTOR" | "PEER" | "MASH";
  error?: string;
  debug?: {
    availableTutors: number;
    availablePeers: number;
    studentLevel: string;
    requestedSubject: string;
  };
}> {
  try {
    // Fetch match request with student data
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
    });

    if (!matchRequest) {
      return { success: false, error: "Match request not found" };
    }

    if (matchRequest.sessionId) {
      return { success: false, error: "Already matched" };
    }

    const student = await prisma.user.findUnique({
      where: { id: matchRequest.studentId },
      include: { studentProfile: true },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    let partnerId: string | null = null;
    let tier: "TUTOR" | "PEER" | "MASH" = "MASH";

    // Collect debug information
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

    // ============ TIER 1: TUTOR MATCH ============
    if (!matchRequest.tier1Tried) {
      const tier1Partner = await findTier1Match(
        matchRequest.studentId,
        matchRequest.subject,
        student.educationLevel
      );

      if (tier1Partner) {
        partnerId = tier1Partner;
        tier = "TUTOR";
      } else {
        // Mark tier1 as attempted (no available tutors)
        await prisma.matchRequest.update({
          where: { id: matchRequestId },
          data: { tier1Tried: true },
        });
      }
    }

    // ============ TIER 2: PEER MATCH ============
    if (!partnerId && !matchRequest.tier2Tried) {
      const tier2Partner = await findTier2Match(
        matchRequest.studentId,
        student.studentProfile?.subjects || [matchRequest.subject],
        student.educationLevel
      );

      if (tier2Partner) {
        partnerId = tier2Partner;
        tier = "PEER";
      } else {
        // Mark tier2 as attempted (no available peers)
        await prisma.matchRequest.update({
          where: { id: matchRequestId },
          data: { tier2Tried: true },
        });
      }
    }

    // ============ TIER 3: AI MATCH (ALWAYS SUCCEEDS) ============
    if (!partnerId && options?.skipAI) {
      return { success: false, error: "No human match found, AI skipped by caller", debug: debugInfo };
    }

    if (!partnerId) {
      tier = "MASH";
      const aiSession = await createAISession(
        matchRequest.studentId,
        matchRequest.subject,
        matchRequest.topic ?? undefined
      );

      // Update match request with AI session
      await prisma.matchRequest.update({
        where: { id: matchRequestId },
        data: {
          sessionId: aiSession.sessionId,
          resolvedAs: "MASH",
          resolvedAt: new Date(),
        },
      });

      return {
        success: true,
        sessionId: aiSession.sessionId,
        roomId: aiSession.roomId,
        tier: "MASH",
        debug: debugInfo,
      };
    }

    // Upsert both users to Stream Chat
    try {
      const student = await prisma.user.findUnique({ where: { id: matchRequest.studentId }, select: { name: true, avatar: true } });
      const partner = await prisma.user.findUnique({ where: { id: partnerId }, select: { name: true, avatar: true } });
      await upsertStreamUsers([
        { id: matchRequest.studentId, name: student?.name || "Student", image: student?.avatar },
        { id: partnerId, name: partner?.name || "Partner", image: partner?.avatar },
      ]);
    } catch {}

    // ============ CREATE SESSION WITH HUMAN PARTNER ============
    const roomId = `room-${randomBytes(8).toString("hex")}`;

    const session = await prisma.session.create({
      data: {
        studentId: matchRequest.studentId,
        partnerId,
        tier: tier === "TUTOR" ? "TUTOR" : "PEER",
        subject: matchRequest.subject,
        topic: matchRequest.topic,
        status: "ACTIVE",
        roomId,
        startedAt: new Date(),
      },
    });

    // Update match request with session
    await prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: {
        sessionId: session.id,
        resolvedAs: tier,
        resolvedAt: new Date(),
      },
    });

    return {
      success: true,
      partnerId,
      sessionId: session.id,
      roomId,
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
 * Called by background job or triggered manually
 */
export async function sweepAndAIFallback() {
  try {
    const timeoutThreshold = new Date(
      Date.now() - SESSION_CONFIG.SESSION_MATCH_TIMEOUT_MS
    );

    // Find requests created >60s ago with no session
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
