"use server";

import { createClient } from "@/utils/supabase/server";
import { AIService } from "@/utils/ai-service";
import { buildEddySystemPrompt } from "@/utils/eddy-context";
import prisma from "@/lib/prisma";
import { saveAiChatMessage } from "@/app/actions/feedback";

export async function handleEddyQuery(
  message: string,
  currentPath?: string
): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userContext: { name?: string; role?: string } | null = null;

    if (user) {
      userContext = {
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        role: user.user_metadata?.role || "student",
      };
    }

    const systemPrompt = await buildEddySystemPrompt(userContext, currentPath);

    // Persist the user's message first (best-effort, non-blocking)
    if (user) {
      void saveAiChatMessage({
        bot: "eddy",
        role: "user",
        content: message,
        metadata: { path: currentPath },
      });
    }

    const response = await AIService.generateCompletion(
      message,
      systemPrompt
    );

    if (!response || response.includes("having a bit of trouble thinking")) {
      const fallback = "Hey! I'm having a little trouble connecting to my brain right now. Please try again in a moment! 💭";
      if (user) {
        void saveAiChatMessage({ bot: "eddy", role: "assistant", content: fallback });
      }
      return fallback;
    }

    // Persist Eddy's reply (best-effort)
    if (user) {
      void saveAiChatMessage({
        bot: "eddy",
        role: "assistant",
        content: response,
      });
      // Also bump the legacy AiConversation counter for the institution dashboard
      try {
        await prisma.aiConversation.create({
          data: {
            userId: user.id,
            modelUsed: "eddy",
            subject: currentPath || null,
          },
        });
      } catch (err) {
        // Silent — non-critical counter
      }
    }

    return response;
  } catch (error) {
    console.error("[Eddy] Error:", error);
    return "Sorry, something went wrong on my end. Please try again!";
  }
}
