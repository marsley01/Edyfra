"use server";

import prisma from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Create a match request (student side)
export async function createMatchRequest(data: { subject: string; topic: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
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

// Accept a match request (tutor side)
export async function acceptMatchRequest(requestId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
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

  // Ensure student exists in Prisma
  const studentExists = await prisma.user.findUnique({
    where: { id: matchRequest.studentId }
  });

  if (!studentExists) {
    try {
      const { data: { user: studentUser } } = await supabase.auth.admin.getUserById(matchRequest.studentId);
      if (studentUser) {
        await prisma.user.create({
          data: {
            id: matchRequest.studentId,
            email: studentUser.email || '',
            name: studentUser.user_metadata?.name || 'Unknown',
            role: studentUser.user_metadata?.role || 'STUDENT',
            educationLevel: studentUser.user_metadata?.educationLevel || 'HIGH_SCHOOL',
            county: studentUser.user_metadata?.county || 'Nairobi'
          }
        });
      }
    } catch (err) {
      console.error("Failed to create student in Prisma:", err);
    }
  }

  const userData = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { tutorProfile: true }
  });

  const tier = userData?.role === "TUTOR" ? "TUTOR" : "PEER";

  // Create the session
  const roomId = `room-${requestId}-${Math.random().toString(36).substring(2, 7)}`;
  const session = await prisma.session.create({
    data: {
      studentId: matchRequest.studentId,
      partnerId: user.id,
      tier: tier as any,
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      status: "ACTIVE",
      roomId: roomId,
      startedAt: new Date(),
    },
  });

  // Update the request
  await prisma.matchRequest.update({
    where: { id: requestId },
    data: {
      sessionId: session.id,
      resolvedAs: tier as any,
      resolvedAt: new Date(),
    }
  });

  // Notify the student
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

// Force AI fallback for unmatched requests
export async function forceAIFallback(requestId: string) {
  try {
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: requestId },
    });

    if (!matchRequest || matchRequest.sessionId) {
      return { success: false, message: "Already matched or not found" };
    }

    // Ensure student exists in Prisma
    const studentExists = await prisma.user.findUnique({
      where: { id: matchRequest.studentId }
    });

    if (!studentExists) {
      try {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: { user: studentUser } } = await adminClient.auth.admin.getUserById(matchRequest.studentId);
        
        if (studentUser) {
          await prisma.user.create({
            data: {
              id: matchRequest.studentId,
              email: studentUser.email || '',
              name: studentUser.user_metadata?.name || 'Unknown',
              role: studentUser.user_metadata?.role || 'STUDENT',
              educationLevel: studentUser.user_metadata?.educationLevel || 'HIGH_SCHOOL',
              county: studentUser.user_metadata?.county || 'Nairobi'
            }
          });
        } else {
          return { success: false, message: "Student not found in Supabase" };
        }
      } catch (err) {
        console.error("Failed to create student in Prisma:", err);
        return { success: false, message: "Failed to create student record" };
      }
    }

    // Create the AI session
    const session = await prisma.session.create({
      data: {
        studentId: matchRequest.studentId,
        partnerId: null, // AI
        tier: "MASH",
        subject: matchRequest.subject,
        topic: matchRequest.topic,
        status: "ACTIVE",
        roomId: `ai-room-${requestId}`,
        startedAt: new Date(),
      },
    });

    // Update the request
    await prisma.matchRequest.update({
      where: { id: requestId },
      data: {
        sessionId: session.id,
        resolvedAs: "MASH",
        resolvedAt: new Date(),
      }
    });

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error in forceAIFallback:", error);
    return { success: false, message: "Internal error" };
  }
}

// Sweep unmatched requests and force AI fallback
export async function sweepUnmatchedRequests() {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const unmatchedRequests = await prisma.matchRequest.findMany({
      where: {
        sessionId: null,
        createdAt: { lt: oneMinuteAgo }
      }
    });

    for (const request of unmatchedRequests) {
      await forceAIFallback(request.id);
    }

    return { success: true, swept: unmatchedRequests.length };
  } catch (error) {
    console.error("Error sweeping unmatched requests:", error);
    return { success: false };
  }
}

// Get session details
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

// Send a message in a session
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

// Check match status
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

// Complete a session and award points
export async function completeSession(sessionId: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { student: true, partner: true }
    });

    if (!session || session.status === "COMPLETED") {
      return { success: true };
    }

    // Mark as completed
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "COMPLETED",
        endedAt: new Date()
      }
    });

    // Reward points
    await prisma.user.update({
      where: { id: session.studentId },
      data: { points: { increment: 50 } }
    });

    if (session.partnerId) {
      await prisma.user.update({
        where: { id: session.partnerId },
        data: { points: { increment: 100 } }
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
