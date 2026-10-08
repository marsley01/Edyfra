"use server";

import prisma from "@/lib/prisma";

export async function getPublicPosts(limit = 10, category?: string) {
  try {
    const where: any = {};
    
    if (category && category !== "All") {
      // Map forum category to feed post subjects if needed, or just exact match
      where.subject = category;
    }

    return await prisma.feedPost.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            educationLevel: true,
          }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      // Public, unauthenticated server action: clamp so callers can't dump
      // the whole feed table in one request.
      take: Math.min(Math.max(Math.floor(Number(limit) || 10), 1), 50),
    });
  } catch (error) {
    console.error("getPublicPosts error:", error);
    return [];
  }
}
