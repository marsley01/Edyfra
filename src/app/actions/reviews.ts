"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/app/actions/notifications";

// ─── Landing Page Testimonials (Supabase reviews table) ──────────────

export interface Review {
  id: string;
  author_name: string;
  school: string;
  quote: string;
  approved: boolean;
  created_at: string;
}

export async function submitReview(data: {
  author_name: string;
  school: string;
  quote: string;
}) {
  if (!data.author_name?.trim() || !data.quote?.trim()) {
    return { error: "Name and review are required." };
  }
  if (data.quote.length < 20) {
    return { error: "Review must be at least 20 characters." };
  }
  if (data.quote.length > 500) {
    return { error: "Review must be under 500 characters." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("reviews").insert({
    author_name: data.author_name.trim(),
    school: data.school?.trim() || "Edyfra Scholar",
    quote: data.quote.trim(),
    approved: false,
  });

  if (error) {
    console.error("Review submission error:", error);
    return { error: "Failed to submit review. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export async function getApprovedReviews(): Promise<Review[]> {
  // Use a plain public client to avoid accessing cookies() during Next.js build caching
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const publicClient = createSupabaseJsClient(url, key, {
    auth: { persistSession: false }
  });

  const { data, error } = await publicClient
    .from("reviews")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data;
}

export async function getPendingReviews(): Promise<Review[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reviews")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function approveReview(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dbUser = user ? await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : [])
      ]
    },
    select: { role: true }
  }) : null;
  if (!user || dbUser?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("reviews").update({ approved: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function deleteReview(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dbUser = user ? await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : [])
      ]
    },
    select: { role: true }
  }) : null;
  if (!user || dbUser?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

// ─── Session Reviews (Prisma Review model) ───────────────────────────

export async function createSessionReview(
  sessionId: string,
  rating: number,
  comment?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { studentId: true, partnerId: true, tier: true },
  });
  if (!session) throw new Error("Session not found");
  if (session.studentId !== user.id) throw new Error("Only the student can review");
  if (!session.partnerId) throw new Error("No tutor to review");
  if (session.tier !== "TUTOR") throw new Error("Only tutor sessions can be reviewed");

  const existing = await prisma.review.findUnique({ where: { sessionId } });
  if (existing) throw new Error("Already reviewed this session");

  const review = await prisma.review.create({
    data: {
      sessionId,
      reviewerId: user.id,
      revieweeId: session.partnerId,
      rating,
      comment,
    },
  });

  await recalculateTutorRating(session.partnerId);

  await notifyUser(session.partnerId, {
    type: "REVIEW_RECEIVED",
    title: "New Review!",
    body: `You received a ${rating}-star review after your session.`,
    actionUrl: `/tutor`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/tutor");
  return review;
}

async function recalculateTutorRating(tutorUserId: string) {
  const result = await prisma.review.aggregate({
    where: { revieweeId: tutorUserId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.tutorProfile.update({
    where: { userId: tutorUserId },
    data: {
      rating: result._avg.rating || 0,
    },
  });
}

export async function getTutorReviews(tutorUserId: string) {
  return prisma.review.findMany({
    where: { revieweeId: tutorUserId },
    include: {
      reviewer: { select: { name: true, avatar: true } },
      session: { select: { subject: true, topic: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllReviewsForAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") throw new Error("Admin only");

  const reviews = await prisma.review.findMany({
    include: {
      reviewer: { select: { name: true } },
      reviewee: { select: { name: true } },
      session: { select: { subject: true, topic: true, tier: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tutorRankings = await prisma.tutorProfile.findMany({
    where: { isVerified: true },
    select: {
      userId: true,
      rating: true,
      totalSessions: true,
      user: { select: { name: true } },
    },
    orderBy: { rating: "desc" },
  });

  return { reviews, tutorRankings };
}
