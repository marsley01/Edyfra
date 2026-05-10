"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isFounderEmail } from "@/utils/admin-guard";
import { generateAIResponse } from "@/utils/openrouter";

async function guard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isFounderEmail(user.email)) throw new Error("Unauthorized");
}

export async function getPlatformSetting(key: string) {
  await guard();
  const setting = await prisma.platformSettings.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function setPlatformSetting(key: string, value: any) {
  await guard();
  await prisma.platformSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/admin/ai-settings");
}

export async function getAllPlatformSettings() {
  await guard();
  const settings = await prisma.platformSettings.findMany();
  const map: Record<string, any> = {};
  for (const s of settings) map[s.key] = s.value;
  return map;
}

export async function generateTestChallenge(subject: string, level: string) {
  await guard();
  const prompt = `Create a single multiple-choice challenge question for ${level === "UNIVERSITY" ? "university" : "high school"} level ${subject}. Return JSON with: question, options (4 strings), answer (A/B/C/D), explanation.`;
  return generateAIResponse(prompt, subject);
}

export async function getAIUsageAnalytics() {
  await guard();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayCount, weekCount, monthCount, totalTokens, recentConversations] = await Promise.all([
    prisma.aiConversation.count({ where: { createdAt: { gte: startToday } } }),
    prisma.aiConversation.count({ where: { createdAt: { gte: startWeek } } }),
    prisma.aiConversation.count({ where: { createdAt: { gte: startMonth } } }),
    prisma.aiConversation.aggregate({ _sum: { tokenCount: true } }),
    prisma.aiConversation.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, userId: true, modelUsed: true, subject: true, tokenCount: true, costEstimate: true, createdAt: true } }),
  ]);

  return {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    totalTokens: totalTokens._sum.tokenCount || 0,
    recentConversations,
  };
}
