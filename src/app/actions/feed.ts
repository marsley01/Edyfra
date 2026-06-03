"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPost(content: string, subject?: string, image?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const userData = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userData) return { success: false, error: "User not found" };

    const post = await prisma.feedPost.create({
      data: {
        userId: user.id,
        content,
        subject,
        image,
        level: userData.educationLevel,
      }
    });

    revalidatePath("/dashboard/feed");
    return { success: true, post };
  } catch (error) {
    console.error("createPost error:", error);
    return { success: false, error: "Failed to create post" };
  }
}

export async function getPosts(filter?: string, topic?: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const userData = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userData) return [];

    const where: any = {};

    if (filter === "school" && userData.educationLevel) {
      where.level = userData.educationLevel;
    }
    
    if (topic) {
      where.subject = topic;
    }

    return await prisma.feedPost.findMany({
      where,
      include: {
        user: true,
        comments: {
          include: {
            user: true
          }
        },
        likedBy: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error("getPosts error:", error);
    return [];
  }
}

export async function likePost(postId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id
        }
      }
    });

    if (existingLike) {
      await prisma.postLike.delete({
        where: { id: existingLike.id }
      });
      await prisma.feedPost.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } }
      });
    } else {
      await prisma.postLike.create({
        data: {
          postId,
          userId: user.id
        }
      });
      await prisma.feedPost.update({
        where: { id: postId },
        data: { likes: { increment: 1 } }
      });
    }

    revalidatePath("/dashboard/feed");
    return { success: true };
  } catch (error) {
    console.error("likePost error:", error);
    return { success: false, error: "Failed to like post" };
  }
}

export async function addComment(postId: string, content: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await prisma.comment.create({
      data: {
        postId,
        userId: user.id,
        content
      }
    });

    revalidatePath("/dashboard/feed");
    return { success: true };
  } catch (error) {
    console.error("addComment error:", error);
    return { success: false, error: "Failed to add comment" };
  }
}
