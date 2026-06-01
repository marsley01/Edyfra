"use server";

import prisma from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG } from "@/lib/config";
import { recalibrateTier } from "./user";
import { MatchTier, Role, EduLevel, Tier } from "@/generated/client";
import { randomBytes } from "crypto";
import { executeSmartMatching, sweepAndAIFallback } from "./match-algorithm";
import { StreamChat } from "stream-chat";
import { notifyUser } from "@/app/actions/notifications";
import { getUserData } from "@/app/actions/user";
import { withRateLimit } from "@/lib/rate-limit";

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
    return { success: false, error: "Request already matched or not found" };
  }

  const userData = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { tutorProfile: true }
  });
  
  const tier = userData?.role === Role.TUTOR ? "TUTOR" : "PEER";

  // Upsert both users to Stream Chat
  try {
    const studentData = await prisma.user.findUnique({ where: { id: matchRequest.studentId }, select: { name: true, avatar: true } });
    await upsertStreamUsers([
      { id: matchRequest.studentId, name: studentData?.name || "Student", image: studentData?.avatar },
      { id: user.id, name: userData?.name || "Tutor", image: userData?.avatar },
    ]);
  } catch {}

  const roomId = `room-${randomBytes(8).toString('hex')}`;
  
  let session;
  try {
    session = await prisma.session.create({
      data: {
        studentId: matchRequest.studentId,
        partnerId: user.id,
        tier: tier as MatchTier,
        subject: matchRequest.subject,
        topic: matchRequest.topic,
        status: "ACTIVE",
        roomId: roomId,
        startedAt: new Date(),
      },
    });

    await prisma.matchRequest.update({
      where: { id: requestId },
      data: {
        sessionId: session.id,
        resolvedAs: tier as MatchTier,
        resolvedAt: new Date(),
      }
    });
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
  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!matchRequest || matchRequest.sessionId) {
    return { success: false, message: "Already matched or not found" };
  }

  const roomId = `mash-${randomBytes(8).toString('hex')}`;
  const session = await prisma.session.create({
    data: {
      studentId: matchRequest.studentId,
      partnerId: null,
      tier: "MASH",
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      status: "ACTIVE",
      roomId,
      startedAt: new Date(),
    },
  });

  await prisma.matchRequest.update({
    where: { id: requestId },
    data: {
      sessionId: session.id,
      resolvedAs: "MASH",
      resolvedAt: new Date(),
    }
  });

  return { success: true, sessionId: session.id };
}

export async function sweepUnmatchedRequests() {
  try {
    const result = await sweepAndAIFallback();
    return result;
  } catch (error) {
    console.error("Error sweeping unmatched requests:", error);
    return { success: false };
  }
}

export async function getSession(id: string) {
  try {
    return await prisma.session.findUnique({
      where: { id },
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
    return { success: false, error };
  }
}

export async function checkMatchStatus(requestId: string) {
  try {
    const request = await prisma.matchRequest.findUnique({
      where: { id: requestId },
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
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { student: true, partner: true }
    });

    if (!session || session.status === "COMPLETED") {
      return { success: true, pointsAwarded: 0 };
    }

    const now = new Date();
    const durationMs = session.startedAt ? now.getTime() - session.startedAt.getTime() : 0;
    const durationMin = Math.floor(durationMs / 60000);
    
    // Require at least 3 minutes to award points (prevent spam/failed rooms)
    const shouldAwardPoints = durationMin >= 3;

    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "COMPLETED",
        endedAt: now,
        durationMin
      }
    });

    let pointsAwarded = 0;

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
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { studentId: userId },
          { partnerId: userId },
        ],
      },
      include: {
        student: { select: { name: true } },
        partner: { select: { name: true } },
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
