"use server";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getTutorProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
    include: { user: true }
  });
}

export async function toggleTutorStatus(isOnline: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  const currentAvailability: any = profile?.availability || {};
  
  await prisma.tutorProfile.update({
    where: { userId: user.id },
    data: {
      availability: { ...currentAvailability, isOnline }
    }
  });

  revalidatePath("/tutor");
  return { success: true };
}

export async function updateTutorAvailability(schedule: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  const currentAvailability: any = profile?.availability || {};

  await prisma.tutorProfile.update({
    where: { userId: user.id },
    data: {
      availability: { ...currentAvailability, schedule }
    }
  });

  revalidatePath("/tutor");
  return { success: true };
}

export async function acceptMatchRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Get the request details
  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId }
  });

  if (!matchRequest || matchRequest.sessionId) {
    throw new Error("Match request already resolved or not found.");
  }

  // 2. Create a real Session
  const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
  
  const session = await prisma.session.create({
    data: {
      studentId: matchRequest.studentId,
      partnerId: user.id,
      tier: "TUTOR",
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      status: "ACTIVE",
      roomId: roomId,
      startedAt: new Date(),
    }
  });

  // 3. Update the Match Request
  await prisma.matchRequest.update({
    where: { id: requestId },
    data: {
      sessionId: session.id,
      resolvedAs: "TUTOR",
      resolvedAt: new Date(),
    }
  });

  // 4. Create a Notification for the student
  await prisma.notification.create({
    data: {
      userId: matchRequest.studentId,
      type: "MATCH_FOUND",
      title: "Match Found!",
      body: "A verified expert has accepted your request. Join the room now!",
      actionUrl: `/study-room/${session.id}`,
    }
  });

  revalidatePath("/tutor/requests");
  revalidatePath("/dashboard/study");
  
  return { success: true, sessionId: session.id };
}

export async function getTutorStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [activeSessions, completedSessions, totalEarnings] = await Promise.all([
    prisma.session.count({ where: { partnerId: user.id, status: "ACTIVE" } }),
    prisma.session.count({ where: { partnerId: user.id, status: "COMPLETED" } }),
    prisma.session.aggregate({
      where: { partnerId: user.id, status: "COMPLETED" },
      _sum: { priceKsh: true }
    })
  ]);

  return {
    activeSessions,
    completedSessions,
    totalEarnings: totalEarnings._sum.priceKsh || 0
  };
}
