"use server";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createPost(content: string, subject?: string, image?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const userData = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!userData) throw new Error("User not found");

  // @ts-ignore - FeedPost might not be in the generated client yet
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
}

export async function getPosts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const userData = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!userData) throw new Error("User not found");

  // @ts-ignore
  return await prisma.feedPost.findMany({
    where: {
      level: userData.educationLevel
    },
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
}

export async function likePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // @ts-ignore
  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: user.id
      }
    }
  });

  if (existingLike) {
    // @ts-ignore
    await prisma.postLike.delete({
      where: { id: existingLike.id }
    });
    // @ts-ignore
    await prisma.feedPost.update({
      where: { id: postId },
      data: { likes: { decrement: 1 } }
    });
  } else {
    // @ts-ignore
    await prisma.postLike.create({
      data: {
        postId,
        userId: user.id
      }
    });
    // @ts-ignore
    await prisma.feedPost.update({
      where: { id: postId },
      data: { likes: { increment: 1 } }
    });
  }

  revalidatePath("/dashboard/feed");
}

export async function addComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // @ts-ignore
  await prisma.comment.create({
    data: {
      postId,
      userId: user.id,
      content
    }
  });

  revalidatePath("/dashboard/feed");
}
