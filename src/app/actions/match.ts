"use server";

import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

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

  // Create the request
  const matchRequest = await prisma.matchRequest.create({
    data: {
      studentId: user.id,
      subject: data.subject,
      topic: data.topic,
    },
  });

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

  const userData = await prisma.user.findUnique({ where: { id: user.id } });
  const tier = userData?.role === "TUTOR" ? "TUTOR" : "PEER";

  // Create the session
  const session = await prisma.session.create({
    data: {
      studentId: matchRequest.studentId,
      partnerId: user.id,
      tier: tier,
      subject: matchRequest.subject,
      topic: matchRequest.topic,
      status: "ACTIVE",
      roomId: `room-${requestId}`,
      startedAt: new Date(),
    },
  });

  // Update the request
  await prisma.matchRequest.update({
    where: { id: requestId },
    data: {
      sessionId: session.id,
      resolvedAs: tier,
      resolvedAt: new Date(),
    },
  });

  return { success: true, sessionId: session.id };
}

export async function forceAIFallback(requestId: string) {
  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!matchRequest || matchRequest.sessionId) {
    return { success: false, message: "Already matched or not found" };
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
    },
  });

  return { success: true, sessionId: session.id };
}
