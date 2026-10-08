"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG } from "@/lib/config";
import { recalibrateTier } from "./user";
import { Role, EduLevel, Tier } from "@generated/client";
import {
  executeSmartMatching,
  sweepAndAIFallback,
  decrementTutorActiveSessions,
  commitAISession,
  acceptRequestAs,
  declineOfferAs,
} from "./match-engine";
import { notifyUser } from "@/app/actions/notifications";
import { MATCH_TIMINGS } from "@/lib/matching/match-flow";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Resolve the signed-in user's Prisma id (matching on id OR email, since legacy
 * rows can carry a different primary key than the Supabase auth id).
 * Returns null when nobody is signed in.
 */
async function getAuthedPrismaUserId(): Promise<string | null> {
  const supabase = await (await import("@/utils/supabase/server")).createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : []),
      ],
    },
    select: { id: true },
  });
  return dbUser?.id ?? user.id;
}

export async function createMatchRequest(data: { subject: string; topic: string }) {
  try {
    const supabase = await (await import("@/utils/supabase/server")).createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please sign in to start matching." };
    }

    const limited = await withRateLimit("createMatchRequest", user.id, async () => {
      // Find by Supabase ID first, then by email (user may exist with different ID)
      let prismaUser = await prisma.user.findUnique({ where: { id: user.id } });

      if (!prismaUser && user.email) {
        prismaUser = await prisma.user.findFirst({ where: { email: user.email } });
      }

      if (!prismaUser) {
        const meta = user.user_metadata || {};
        prismaUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: meta.name || meta.full_name || "User",
            role: "STUDENT" as Role,
            educationLevel: "HIGH_SCHOOL" as EduLevel,
            county: "Nairobi",
            tier: "BRONZE" as Tier,
            points: SESSION_CONFIG.NEW_USER_WELCOME_BONUS,
            lastActiveAt: new Date(),
            avatar: meta.avatar || null,
          },
        });
      }

      if (prismaUser.banned || prismaUser.suspended) {
        return { error: "Your account can't start matches right now." };
      }

      const subject = (data.subject ?? "").trim().slice(0, 80);
      if (!subject) return { error: "Please pick a subject." };
      const topic = (data.topic ?? "").trim().slice(0, 200);

      // One live request per student: a double click or a second tab used to
      // create parallel requests that could each get matched.
      const existing = await prisma.matchRequest.findFirst({
        where: {
          studentId: prismaUser.id,
          sessionId: null,
          createdAt: { gte: new Date(Date.now() - MATCH_TIMINGS.AI_FALLBACK_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, subject: true },
      });
      if (existing && existing.subject === subject) {
        return { matchRequestId: existing.id };
      }
      if (existing) {
        await prisma.matchRequest.deleteMany({ where: { id: existing.id, sessionId: null } });
      }

      const matchRequest = await prisma.matchRequest.create({
        data: {
          studentId: prismaUser.id,
          subject,
          topic: topic || null,
        },
      });

      revalidatePath("/tutor/requests");
      return { matchRequestId: matchRequest.id };
    }, { interval: 60_000, maxRequests: 10 });

    if (!limited.success) {
      return { success: false, error: limited.error };
    }
    if ("error" in limited.data) {
      return { success: false, error: limited.data.error };
    }

    return { success: true, matchRequestId: limited.data.matchRequestId };
  } catch (err: any) {
    console.error("[createMatchRequest] Error:", err);
    return { success: false, error: err?.message || "Failed to create match request" };
  }
}

export async function acceptMatchRequest(requestId: string) {
  const me = await getAuthedPrismaUserId();
  if (!me) return { success: false as const, error: "Please sign in to accept a match." };

  const limited = await withRateLimit("acceptMatchRequest", me, () => acceptRequestAs(requestId, me), {
    interval: 60_000,
    maxRequests: 20,
  });
  if (!limited.success) return { success: false as const, error: limited.error };
  const result = limited.data;

  if (result.success) {
    revalidatePath("/tutor/requests");
    revalidatePath("/dashboard/study");
    revalidatePath("/dashboard/sessions");
  }
  return result;
}

/**
 * Tutor passes on the exclusive offer they hold; the student's next poll
 * offers the request to the next-best tutor.
 */
export async function declineMatchOffer(requestId: string) {
  const me = await getAuthedPrismaUserId();
  if (!me) return { success: false };
  const result = await declineOfferAs(requestId, me);
  revalidatePath("/tutor/requests");
  return result;
}

/**
 * NEW: Initiate auto-matching using smart algorithm
 * Called after student creates match request
 * Immediately tries tier1 → tier2 → tier3 matching
 */
export async function initiateAutoMatch(requestId: string, options?: { skipAI?: boolean }) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false, error: "Please sign in to start matching." };
    const owned = await prisma.matchRequest.findUnique({
      where: { id: requestId },
      select: { studentId: true },
    });
    if (!owned || owned.studentId !== me) {
      return { success: false, error: "Match request not found." };
    }

    const result = await executeSmartMatching(requestId, options);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        phase: result.phase,
        offerExpiresAt: result.offerExpiresAt ?? null,
        gone: result.gone ?? false,
      };
    }

    // Notify the student only when THIS call created the session; repeat polls
    // (and tutor accepts, which notify on their own) used to send duplicates.
    if (result.sessionId && !result.alreadyResolved) {
      try {
        const tierName = result.tier === "TUTOR" ? "tutor" : result.tier === "PEER" ? "study partner" : "Mash AI";
        if (result.partnerId) {
          const partner = await prisma.user.findUnique({
            where: { id: result.partnerId },
            select: { name: true },
          });
          await notifyUser(me, {
            type: "MATCH_FOUND",
            title: "Connected!",
            body: `You've been matched with ${partner?.name || `a ${tierName}`}! Starting session...`,
            actionUrl: `/study-room/${result.sessionId}`,
          });
        } else {
          await notifyUser(me, {
            type: "MATCH_FOUND",
            title: "Ready to learn!",
            body: "Mash AI is ready to help. Entering room...",
            actionUrl: `/study-room/${result.sessionId}`,
          });
        }
      } catch (e) {
        console.error("Failed to notify student:", e);
      }
    }

    return {
      success: true,
      sessionId: result.sessionId,
      roomId: result.roomId,
      tier: result.tier,
      partnerId: result.partnerId,
    };
  } catch (error) {
    console.error("Error in initiateAutoMatch:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function forceAIFallback(requestId: string) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false, message: "Please sign in." };

    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: requestId },
    });

    if (!matchRequest || matchRequest.sessionId || matchRequest.studentId !== me) {
      return { success: false, message: "Already matched or not found" };
    }

    // Atomic: AI Session create + MatchRequest resolve in one transaction.
    const { sessionId } = await commitAISession({
      matchRequestId: requestId,
      studentId: matchRequest.studentId,
      subject: matchRequest.subject,
      topic: matchRequest.topic,
    });

    return { success: true, sessionId };
  } catch (error) {
    // commitAISession throws when the request was resolved concurrently; an
    // unhandled throw here left the matching overlay spinning.
    console.error("Error in forceAIFallback:", error);
    return { success: false, message: "Already matched or not found" };
  }
}

export async function cancelMatchRequest(requestId: string) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false, error: "Please sign in." };
    // Only the requesting student may cancel, and never once it's been matched.
    await prisma.matchRequest.deleteMany({
      where: { id: requestId, studentId: me, sessionId: null },
    });
    revalidatePath("/tutor/requests");
    return { success: true };
  } catch (error) {
    console.error("Error cancelling match request:", error);
    return { success: false, error: "Failed to cancel match request" };
  }
}

export async function sweepUnmatchedRequests() {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false };
    const result = await sweepAndAIFallback();
    return result;
  } catch (error) {
    console.error("Error sweeping unmatched requests:", error);
    return { success: false };
  }
}

export async function getSession(id: string) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return null;
    return await prisma.session.findFirst({
      where: { id, OR: [{ studentId: me }, { partnerId: me }] },
      include: {
        student: { select: { name: true, avatar: true } },
        partner: { select: { name: true, avatar: true } }
      }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

export async function sendMessage(data: { sessionId: string; senderId: string; content: string; isMash: boolean }) {
  try {
    // senderId comes from the client; it must be the caller, and the caller
    // must be in the session.
    const me = await getAuthedPrismaUserId();
    if (!me || data.senderId !== me) {
      return { success: false, error: "Unauthorized" };
    }
    const participant = await prisma.session.findFirst({
      where: { id: data.sessionId, OR: [{ studentId: me }, { partnerId: me }] },
      select: { id: true },
    });
    if (!participant) return { success: false, error: "Unauthorized" };

    const message = await prisma.message.create({
      data: {
        sessionId: data.sessionId,
        senderId: data.senderId,
        content: data.content,
        isMash: data.isMash,
      }
    });
    return { success: true, message };
  } catch (error) {
    console.error('Error sending message via Server Action:', error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send message" };
  }
}

export async function checkMatchStatus(requestId: string) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false };
    const request = await prisma.matchRequest.findFirst({
      where: { id: requestId, studentId: me },
      select: { sessionId: true }
    });
    return { success: true, sessionId: request?.sessionId };
  } catch (error) {
    console.error('Error checking match status:', error);
    return { success: false };
  }
}

export async function completeSession(sessionId: string) {
  try {
    const me = await getAuthedPrismaUserId();
    if (!me) return { success: false, pointsAwarded: 0 };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { student: true, partner: true }
    });

    if (!session || session.status === "COMPLETED") {
      return { success: true, pointsAwarded: 0 };
    }

    // Only a participant can end the session (previously anyone could complete
    // any session and farm points for arbitrary users).
    if (session.studentId !== me && session.partnerId !== me) {
      return { success: false, pointsAwarded: 0 };
    }

    const now = new Date();
    const durationMs = session.startedAt ? now.getTime() - session.startedAt.getTime() : 0;
    const durationMin = Math.floor(durationMs / 60000);
    
    // Require at least 3 minutes to award points (prevent spam/failed rooms)
    const shouldAwardPoints = durationMin >= 3;

    // Conditional update: when both participants hang up at once only the
    // first call may proceed; otherwise points were awarded twice.
    const claimed = await prisma.session.updateMany({
      where: { id: sessionId, status: { not: "COMPLETED" } },
      data: {
        status: "COMPLETED",
        endedAt: now,
        durationMin
      }
    });
    if (claimed.count === 0) {
      return { success: true, pointsAwarded: 0 };
    }

    let pointsAwarded = 0;

    // Track analytics event for session completion
    try {
      const { trackAnalyticsEvent, awardReferralBonus } = await import("./analytics");
      await trackAnalyticsEvent(session.studentId, "session_complete", {
        sessionId: session.id,
        subject: session.subject,
        tier: session.tier,
        durationMin,
      });

      // Check if this is the student's first session — award referral bonus
      const studentSessionCount = await prisma.session.count({
        where: { studentId: session.studentId, status: "COMPLETED" },
      });
      if (studentSessionCount === 1) {
        await awardReferralBonus(session.studentId);
        await trackAnalyticsEvent(session.studentId, "first_session", {
          sessionId: session.id,
        });
      }
    } catch (e) {
      console.error("Failed to track analytics/referral:", e);
    }

    // Decrement tutor's active sessions
    if (session.partnerId && session.tier === "TUTOR") {
      await decrementTutorActiveSessions(session.partnerId);
    }

    if (shouldAwardPoints) {
      pointsAwarded = SESSION_CONFIG.POINTS_STUDENT;
      await prisma.user.update({
        where: { id: session.studentId },
        data: { points: { increment: SESSION_CONFIG.POINTS_STUDENT } }
      });
      await recalibrateTier(session.studentId);
      
      await notifyUser(session.studentId, {
        type: "POINTS_EARNED",
        title: "Session Completed!",
        body: `You earned +${SESSION_CONFIG.POINTS_STUDENT} points for completing a study session.`,
        actionUrl: `/dashboard/sessions`,
      });

      if (session.partnerId) {
        await prisma.user.update({
          where: { id: session.partnerId },
          data: { points: { increment: SESSION_CONFIG.POINTS_TUTOR } }
        });
        await recalibrateTier(session.partnerId);
        
        await notifyUser(session.partnerId, {
          type: "POINTS_EARNED",
          title: "Session Completed!",
          body: `You earned +${SESSION_CONFIG.POINTS_TUTOR} points for helping a peer!`,
          actionUrl: `/dashboard/sessions`,
        });
      }
    }

    revalidatePath("/dashboard/sessions");
    revalidatePath("/tutor");
    
    return { success: true, pointsAwarded };
  } catch (error) {
    console.error("Error completing session:", error);
    return { success: false, pointsAwarded: 0 };
  }
}

export async function getUserSessions(userId: string) {
  try {
    // Always scope to the caller. The id argument used to be trusted, letting
    // anyone read another user's sessions, and it also missed legacy users
    // whose Prisma id differs from the auth id. Kept for call-site compatibility.
    const me = await getAuthedPrismaUserId();
    if (!me) return [];
    userId = me;
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { studentId: userId },
          { partnerId: userId },
        ],
      },
      include: {
        student: { select: { name: true } },
        partner: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    return sessions;
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
}
