"use server";

import prisma from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG } from "@/lib/config";
import { MatchTier } from "@prisma/client";
import { randomBytes } from "crypto";
import { executeSmartMatching, sweepAndAIFallback } from "./match-algorithm";

export async function createMatchRequest(data: { subject: string; topic: string }) {
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
    throw new Error("Unauthorized");
  }

  const matchRequest = await prisma.matchRequest.create({
    data: {
      studentId: user.id,
      subject: data.subject,
      topic: data.topic,
    },
  });

  revalidatePath("/tutor/requests");
  return { success: true, matchRequestId: matchRequest.id };
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
    throw new Error("Unauthorized");
  }

  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!matchRequest || matchRequest.sessionId) {
    throw new Error("Request already matched or not found");
  }

  const userData = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { tutorProfile: true }
  });
  
  const tier = userData?.role === "TUTOR" ? "TUTOR" : "PEER";

  const roomId = `room-${randomBytes(8).toString('hex')}`;
    const session = await prisma.session.create({
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

  try {
    await prisma.notification.create({
      data: {
        userId: matchRequest.studentId,
        type: "MATCH_FOUND",
        title: "Help is here!",
        body: `${userData?.name || 'An expert'} has accepted your request. Entering room...`,
        actionUrl: `/study-room/${session.id}`,
      }
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
export async function initiateAutoMatch(requestId: string) {
  try {
    const result = await executeSmartMatching(requestId);
    
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

          await prisma.notification.create({
            data: {
              userId: matchRequest?.studentId || "",
              type: "MATCH_FOUND",
              title: "Connected!",
              body: `You've been matched with ${partner?.name || tierName}! Starting session...`,
              actionUrl: `/study-room/${result.sessionId}`,
            }
          });
        } else {
          // AI match
          await prisma.notification.create({
            data: {
              userId: matchRequest?.studentId || "",
              type: "MATCH_FOUND",
              title: "Ready to learn!",
              body: "Mash AI is ready to help. Entering room...",
              actionUrl: `/study-room/${result.sessionId}`,
            }
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

  const roomId = `ai-${randomBytes(8).toString('hex')}`;
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
      return { success: true };
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "COMPLETED",
        endedAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: session.studentId },
      data: { points: { increment: SESSION_CONFIG.POINTS_STUDENT } }
    });

    if (session.partnerId) {
      await prisma.user.update({
        where: { id: session.partnerId },
        data: { points: { increment: SESSION_CONFIG.POINTS_TUTOR } }
      });
    }

    revalidatePath("/dashboard/sessions");
    revalidatePath("/tutor");
    
    return { success: true };
  } catch (error) {
    console.error("Error completing session:", error);
    return { success: false };
  }
}
