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
      take: limit,
    });
  } catch (error) {
    console.error("getPublicPosts error:", error);
    return [];
  }
}
