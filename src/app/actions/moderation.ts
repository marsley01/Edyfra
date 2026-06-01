"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

const MODERATION_URL = process.env.PYTHON_MODERATION_URL || "http://localhost:8003";

export async function moderateMessage(text: string, userId: string, sessionId?: string) {
  try {
    const res = await fetch(`${MODERATION_URL}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        user_id: userId,
        source: "message",
        session_id: sessionId,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const result = await res.json();

    if (result.should_report) {
      await prisma.user.update({
        where: { id: userId },
        data: { strikes: { increment: 1 } },
      });

      if (result.toxicity_score >= 0.8) {
        await prisma.message.updateMany({
          where: { sessionId, content: text },
          data: { flagged: true },
        });
      }
    }

    return result;
  } catch {
    return null;
  }
}

export async function getModerationReports() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") throw new Error("Admin only");

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const flaggedUsers = await prisma.user.findMany({
    where: { strikes: { gt: 0 } },
    select: { id: true, name: true, strikes: true, banned: true, suspended: true },
    orderBy: { strikes: "desc" },
  });

  return { reports, flaggedUsers };
}
