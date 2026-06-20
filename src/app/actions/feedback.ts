"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── User feedback (tutor + student) ─────────────────────────────────────────

export type FeedbackCategory =
  | "bug"
  | "idea"
  | "compliment"
  | "complaint"
  | "other";

export interface FeedbackInput {
  category: FeedbackCategory;
  rating?: number;
  subject?: string;
  message: string;
  context?: string;
}

export async function submitFeedback(
  input: FeedbackInput,
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to send feedback." };

  if (!input.message?.trim()) return { error: "Feedback cannot be empty." };
  if (input.message.length > 4000)
    return { error: "Feedback is too long. Keep it under 4,000 characters." };
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5))
    return { error: "Rating must be between 1 and 5." };

  const validCategories: FeedbackCategory[] = [
    "bug",
    "idea",
    "compliment",
    "complaint",
    "other",
  ];
  if (!validCategories.includes(input.category))
    return { error: "Invalid category." };

  let dbUser;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, name: true, email: true },
    });
  } catch (err) {
    console.error("[submitFeedback] prisma error:", err);
    return { error: "Could not load your profile. Please try again." };
  }

  if (!dbUser) return { error: "Profile not found." };

  try {
    await prisma.feedback.create({
      data: {
        userId: dbUser.id,
        userRole: dbUser.role,
        category: input.category,
        rating: input.rating ?? null,
        subject: input.subject?.trim() || null,
        message: input.message.trim(),
        context: input.context?.slice(0, 500) || null,
      },
    });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (err) {
    console.error("[submitFeedback] insert error:", err);
    return { error: "Could not send feedback. Please try again." };
  }
}

// ─── Admin: read + manage feedback ───────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") throw new Error("Unauthorized: admin only");
  return user;
}

export async function getAllFeedback(filter?: {
  status?: "new" | "read" | "archived" | "all";
  category?: FeedbackCategory | "all";
}) {
  await requireAdmin();
  const status = filter?.status && filter.status !== "all" ? filter.status : undefined;
  const category =
    filter?.category && filter.category !== "all" ? filter.category : undefined;

  try {
    return await prisma.feedback.findMany({
      where: { ...(status ? { status } : {}), ...(category ? { category } : {}) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });
  } catch (err) {
    console.error("[getAllFeedback] error:", err);
    return [];
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: "new" | "read" | "archived",
): Promise<{ success?: true; error?: string }> {
  await requireAdmin();
  try {
    await prisma.feedback.update({ where: { id: feedbackId }, data: { status } });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (err) {
    console.error("[updateFeedbackStatus] error:", err);
    return { error: "Could not update feedback." };
  }
}

export async function setFeedbackAdminNote(
  feedbackId: string,
  adminNote: string,
): Promise<{ success?: true; error?: string }> {
  await requireAdmin();
  try {
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { adminNote: adminNote.trim() || null },
    });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (err) {
    console.error("[setFeedbackAdminNote] error:", err);
    return { error: "Could not save note." };
  }
}

export async function deleteFeedback(
  feedbackId: string,
): Promise<{ success?: true; error?: string }> {
  await requireAdmin();
  try {
    await prisma.feedback.delete({ where: { id: feedbackId } });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (err) {
    console.error("[deleteFeedback] error:", err);
    return { error: "Could not delete feedback." };
  }
}

// ─── AI chat history (Eddy + Mash) ───────────────────────────────────────────

export interface AiChatMessageInput {
  bot: "eddy" | "mash";
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
}

export async function saveAiChatMessage(
  input: AiChatMessageInput,
): Promise<{ success?: true; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (!input.content?.trim()) return { error: "Empty message." };
  if (input.content.length > 16000)
    return { error: "Message too long (>16k chars)." };

  try {
    const row = await prisma.aiChatMessage.create({
      data: {
        userId: user.id,
        bot: input.bot,
        role: input.role,
        content: input.content.trim(),
        metadata: input.metadata ?? undefined,
      },
    });
    return { success: true, id: row.id };
  } catch (err) {
    console.error("[saveAiChatMessage] error:", err);
    return { error: "Could not save message." };
  }
}

export async function getMyAiChatHistory(
  bot: "eddy" | "mash",
  limit = 100,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    return await prisma.aiChatMessage.findMany({
      where: { userId: user.id, bot },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  } catch (err) {
    console.error("[getMyAiChatHistory] error:", err);
    return [];
  }
}

// ─── Admin: review all AI conversations ──────────────────────────────────────

export async function getAllAiConversations(filter?: {
  bot?: "eddy" | "mash" | "all";
  userId?: string;
}) {
  await requireAdmin();
  const where: any = {};
  if (filter?.bot && filter.bot !== "all") where.bot = filter.bot;
  if (filter?.userId) where.userId = filter.userId;

  try {
    // Distinct userIds with their last activity
    const messages = await prisma.aiChatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    // Group by userId + bot
    const grouped = new Map<string, typeof messages>();
    for (const m of messages) {
      const key = `${m.userId}::${m.bot}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    return Array.from(grouped.entries()).map(([key, msgs]) => {
      const [userId, bot] = key.split("::");
      const first = msgs[0];
      return {
        userId,
        bot,
        user: first.user,
        messageCount: msgs.length,
        lastMessageAt: first.createdAt,
        lastMessage: first.content.slice(0, 200),
      };
    });
  } catch (err) {
    console.error("[getAllAiConversations] error:", err);
    return [];
  }
}

export async function getAiConversationThread(
  userId: string,
  bot: "eddy" | "mash",
) {
  await requireAdmin();
  try {
    return await prisma.aiChatMessage.findMany({
      where: { userId, bot },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });
  } catch (err) {
    console.error("[getAiConversationThread] error:", err);
    return [];
  }
}
