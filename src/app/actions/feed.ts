"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

import { AIService } from "@/utils/ai-service";

export async function createPost(content: string, subject?: string, image?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const userData = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!userData) throw new Error("User not found");

  // AI Moderation Step
  try {
    const ai = new AIService({
      provider: "google",
      systemPrompt: `You are an AI moderator for Edyfra, an institutional scholarly platform for students in Kenya. 
        Analyze the following post content. If it is educational, encouraging, or related to student life, respond with "SAFE". 
        If it contains hate speech, profanity, or is completely irrelevant to education/learning, respond with "REJECTED: [reason]".`
    });
    
    const moderationResult = await ai.generateResponse(content);
    if (moderationResult.toUpperCase().includes("REJECTED")) {
      throw new Error(moderationResult);
    }
  } catch (error: any) {
    console.error("Moderation Error:", error);
    if (error.message.includes("REJECTED")) throw error;
    // Fallback: allow if AI fails for technical reasons, but log it
  }
  
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

  
  return await prisma.feedPost.findMany({
    where: {
      ...(userData.educationLevel ? { level: userData.educationLevel } : {}),
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
}

export async function addComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  
  await prisma.comment.create({
    data: {
      postId,
      userId: user.id,
      content
    }
  });

  revalidatePath("/dashboard/feed");
}
