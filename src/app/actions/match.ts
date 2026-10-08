"use server";

import prisma from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG } from "@/lib/config";
import { recalibrateTier } from "./user";
import { MatchTier, Role, EduLevel, Tier } from "@generated/client";
import {
  executeSmartMatching,
  sweepAndAIFallback,
  decrementTutorActiveSessions,
  commitHumanMatch,
  commitAISession,
} from "./match-engine";
import { syncUsersToStream } from "@/lib/user-sync";
import { notifyUser } from "@/app/actions/notifications";
import { getUserData } from "@/app/actions/user";
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

      const matchRequest = await prisma.matchRequest.create({
        data: {
          studentId: prismaUser.id,
          subject: data.subject,
          topic: data.topic,
        },
      });

      revalidatePath("/tutor/requests");
      return { matchRequestId: matchRequest.id };
    }, { interval: 60_000, maxRequests: 10 });

    if (!limited.success) {
      return { success: false, error: limited.error };
    }

    return { success: true, matchRequestId: limited.data.matchRequestId };
  } catch (err: any) {
    console.error("[createMatchRequest] Error:", err);
    return { success: false, error: err?.message || "Failed to create match request" };
  }
}

export async function acceptMatchRequest(requestId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any) {
          try { cookiesToSet.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please sign in to accept a match." };
  }

  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!matchRequest || matchRequest.sessionId) {
    return { success: false, error: "Match request no longer available." };
  }

  if (matchRequest.studentId === user.id) {
    return { success: false, error: "You can't accept your own request." };
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });
  
  const tier = userData?.role === Role.TUTOR ? "TUTOR" : "PEER";

  // Ensure both users exist in Stream Chat via the centralized sync pipeline.
  // Prisma is the source of truth for names + avatars, so we don't pass them in.
  try {
    await syncUsersToStream([matchRequest.studentId, user.id]);
  } catch {}

  // Atomic commit: Session create + MatchRequest resolve (+ tutor load increment
  // for TUTOR tier) all in one transaction. A crash anywhere here rolls back the
  // whole thing, so the request never ends up "half-matched".
  let session;
  try {
    const committed = await commitHumanMatch({
      matchRequestId: requestId,
      studentId: matchRequest.studentId,
      partnerId: user.id,
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      tier: tier === "TUTOR" ? "TUTOR" : "PEER",
    });
    session = { id: committed.sessionId };
  } catch (error: any) {
    // If the student user record was deleted (P2003 Foreign Key constraint failed)
    if (error.code === 'P2003') {
      // Clean up the orphaned match request
      await prisma.matchRequest.delete({ where: { id: requestId } });
      return { success: false, error: "This student is no longer available. Request removed from feed." };
    }
    return { success: false, error: "Failed to create session. Please try again." };
  }

  try {
    await notifyUser(matchRequest.studentId, {
      type: "MATCH_FOUND",
      title: "Help is here!",
      body: `${userData?.name || 'An expert'} has accepted your request. Entering room...`,
      actionUrl: `/study-room/${session.id}`,
    });
  } catch (e) {
    console.error("Failed to notify student:", e);
  }

  revalidatePath("/tutor/requests");
  revalidatePath("/dashboard/study");
  revalidatePath("/dashboard/sessions");
  
  return { success: true, sessionId: session.id };
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
      return { success: false, error: result.error };
    }

    // Notify student of match result
    if (result.sessionId) {
      try {
        const matchRequest = await prisma.matchRequest.findUnique({
          where: { id: requestId },
        });

        const tierName = result.tier === "TUTOR" ? "tutor" : result.tier === "PEER" ? "study partner" : "Mash AI";
        
        if (result.partnerId) {
          const partner = await prisma.user.findUnique({
            where: { id: result.partnerId },
            select: { name: true }
          });

          await notifyUser(matchRequest?.studentId || "", {
            type: "MATCH_FOUND",
            title: "Connected!",
            body: `You've been matched with ${partner?.name || tierName}! Starting session...`,
            actionUrl: `/study-room/${result.sessionId}`,
          });
        } else {
          await notifyUser(matchRequest?.studentId || "", {
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
