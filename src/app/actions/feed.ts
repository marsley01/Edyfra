"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/app/actions/notifications";

export async function createPost(content: string, subject?: string, image?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const userData = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!userData) throw new Error("User not found");

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

export async function getPosts(filter?: string) {
  // Reading the forum should work without authentication.
  // Authentication is only required for actions like liking/commenting/creating posts.
  const supabase = await createClient();
  let userData: { educationLevel: any } | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { educationLevel: true },
      });
    }
  } catch {
    // Ignore auth errors (forum remains readable).
  }

  const where: any = {};

  if (filter === "school" && userData?.educationLevel) {
    where.level = userData.educationLevel;
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
}

export async function getTrendingSubjects(limit = 6) {
  const groups = await prisma.feedPost.groupBy({
    by: ["subject"],
    where: { subject: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: limit,
  });

  return groups
    .filter((g) => g.subject)
    .map((g) => ({
      subject: g.subject as string,
      posts: g._count._all,
    }));
}

export async function likePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  
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
      data: { postId, userId: user.id }
    });
    await prisma.feedPost.update({
      where: { id: postId },
      data: { likes: { increment: 1 } }
    });

    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: { userId: true, content: true }
    });
    if (post && post.userId !== user.id) {
      const liker = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true }
      });
      await notifyUser(post.userId, {
        type: "NEW_MESSAGE",
        title: "New Like",
        body: `${liker?.name || "Someone"} liked your post: "${post.content.slice(0, 80)}${post.content.length > 80 ? "..." : ""}"`,
        actionUrl: "/dashboard/feed",
      });
    }
  }

  revalidatePath("/dashboard/feed");
}

export async function addComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  
  const post = await prisma.feedPost.findUnique({
    where: { id: postId },
    select: { userId: true }
  });

  await prisma.comment.create({
    data: { postId, userId: user.id, content }
  });

  if (post && post.userId !== user.id) {
    const commenter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true }
    });
    await notifyUser(post.userId, {
      type: "NEW_MESSAGE",
      title: "New Comment",
      body: `${commenter?.name || "Someone"} commented on your post: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
      actionUrl: "/dashboard/feed",
    });
  }

  revalidatePath("/dashboard/feed");
}
