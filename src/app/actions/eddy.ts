"use server";

import { createClient } from "@/utils/supabase/server";
import { AIService } from "@/utils/ai-service";
import { buildEddySystemPrompt } from "@/utils/eddy-context";

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

    const response = await AIService.generateCompletion(
      message,
      systemPrompt
    );

    if (!response || response.includes("having a bit of trouble thinking")) {
      return "Hey! I'm having a little trouble connecting to my brain right now. Please try again in a moment! 💭";
    }

    return response;
  } catch (error) {
    console.error("[Eddy] Error:", error);
    return "Sorry, something went wrong on my end. Please try again!";
  }
}
