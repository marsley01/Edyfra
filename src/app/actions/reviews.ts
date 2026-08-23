"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface Review {
  id: string;
  author_name: string;
  school: string;
  quote: string;
  rating: number;
  approved: boolean;
  created_at: string;
}

export async function submitReview(data: {
  author_name: string;
  school: string;
  quote: string;
  rating: number;
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
  if (data.rating < 1 || data.rating > 5) {
    return { error: "Rating must be between 1 and 5." };
  }

  try {
    await prisma.siteTestimonial.create({
      data: {
        authorName: data.author_name.trim(),
        school: data.school?.trim() || "Edyfra Scholar",
        quote: data.quote.trim(),
        rating: data.rating,
        approved: false,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Review submission error:", error);
    return { error: "Failed to submit review. Please try again." };
  }
}

export async function getApprovedReviews(): Promise<Review[]> {
  try {
    const data = await prisma.siteTestimonial.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return data.map((d) => ({
      id: d.id,
      author_name: d.authorName,
      school: d.school || "",
      quote: d.quote,
      rating: d.rating,
      approved: d.approved,
      created_at: d.createdAt.toISOString(),
    }));
  } catch (error) {
    return [];
  }
}

export async function getPendingReviews(): Promise<Review[]> {
  try {
    const data = await prisma.siteTestimonial.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
    });
    return data.map((d) => ({
      id: d.id,
      author_name: d.authorName,
      school: d.school || "",
      quote: d.quote,
      rating: d.rating,
      approved: d.approved,
      created_at: d.createdAt.toISOString(),
    }));
  } catch (error) {
    return [];
  }
}

export async function approveReview(id: string) {
  try {
    await prisma.siteTestimonial.update({
      where: { id },
      data: { approved: true },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to approve review" };
  }
}

export async function deleteReview(id: string) {
  try {
    await prisma.siteTestimonial.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete review" };
  }
}

// ─── Admin Feedback Dashboard (tutor-student session reviews) ────────────────

export async function getAllReviewsForAdmin(): Promise<{
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: { name: string | null } | null;
    reviewee: { name: string | null } | null;
    session: { subject: string; tier: string } | null;
  }>;
  tutorRankings: Array<{
    userId: string;
    user: { name: string | null };
    totalSessions: number;
    rating: number;
  }>;
}> {
  try {
    const { checkAdminStatus } = await import("./admin");
    if (!(await checkAdminStatus())) return { reviews: [], tutorRankings: [] };

    const [reviews, grouped] = await Promise.all([
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { name: true } },
          reviewee: { select: { name: true } },
          session: { select: { subject: true, tier: true } },
        },
      }),
      prisma.review.groupBy({
        by: ["revieweeId"],
        _count: { id: true },
        _avg: { rating: true },
        orderBy: { _avg: { rating: "desc" } },
      }),
    ]);

    // Resolve names for ranked tutors
    const rankedUserIds = grouped.map((g) => g.revieweeId);
    const rankedUsers = await prisma.user.findMany({
      where: { id: { in: rankedUserIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(rankedUsers.map((u) => [u.id, u.name]));

    const tutorRankings = grouped
      .map((g) => ({
        userId: g.revieweeId,
        user: { name: userMap.get(g.revieweeId) ?? null },
        totalSessions: g._count.id,
        rating: g._avg.rating ?? 0,
      }))
      .sort((a, b) => b.rating - a.rating || b.totalSessions - a.totalSessions);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        reviewer: r.reviewer,
        reviewee: r.reviewee,
        session: r.session,
      })),
      tutorRankings,
    };
  } catch (error) {
    console.error("getAllReviewsForAdmin error:", error);
    return { reviews: [], tutorRankings: [] };
  }
}

// ─── Session Review (tutor-student, written after a live session) ─────────────

export async function createSessionReview(
  sessionId: string,
  rating: number,
  comment?: string
) {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Look up the reviewer's DB id
  const reviewer = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : []),
      ],
    },
    select: { id: true },
  });
  if (!reviewer) throw new Error("User not found");

  // Fetch the session to find the reviewee (the other participant)
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { studentId: true, partnerId: true },
  });
  if (!session) throw new Error("Session not found");

  const revieweeId =
    session.studentId === reviewer.id ? session.partnerId : session.studentId;
  if (!revieweeId) throw new Error("Session has no partner to review");

  // Upsert so a user can update their review
  await prisma.review.upsert({
    where: { sessionId },
    create: {
      sessionId,
      reviewerId: reviewer.id,
      revieweeId,
      rating,
      comment: comment ?? null,
    },
    update: {
      rating,
      comment: comment ?? null,
    },
  });

  revalidatePath(`/study-room/${sessionId}`);
  return { success: true };
}