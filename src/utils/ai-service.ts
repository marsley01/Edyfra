import { getAI } from "@/lib/preflight/instance";
import { getAIConfig } from "@/lib/ai-config";
import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;
let currentKey: string | null = null;

let currentProvider: string = "openrouter";

async function getOpenAI() {
  const config = await getAIConfig();
  const apiKey = config.apiKey ?? undefined;
  let provider = "openrouter";

  if (!apiKey) return null;

  // Legacy keys saved before the OpenRouter migration are Gemini-native.
  if (apiKey.startsWith("AIzaSy")) {
    provider = "gemini";
  }

  if (!openaiInstance || currentKey !== apiKey) {
    currentKey = apiKey;
    currentProvider = provider;

    const baseURL =
      provider === "gemini"
        ? "https://generativelanguage.googleapis.com/v1beta/openai/"
        : "https://openrouter.ai/api/v1";

    openaiInstance = new OpenAI({
      baseURL,
      apiKey: apiKey,
      defaultHeaders:
        provider === "openrouter"
          ? {
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com",
              "X-Title": "Edyfra",
            }
          : undefined,
    });
  }
  return openaiInstance;
}

export class AIService {
  static async generateCompletion(
    prompt: string,
    systemPrompt: string = "You are an expert educational assistant.",
    model?: string,
  ): Promise<string> {
    const defaultModel = (await getAIConfig()).model;
    const chosenModel = model ?? defaultModel;
    try {
      const ai = await getAI();
      return await ai.generateCompletion(prompt, systemPrompt, { model: chosenModel });
    } catch {
      const openai = await getOpenAI();
      if (!openai) {
        console.warn("[AIService] API Key is missing. Returning offline message.");
        return "AI services are currently offline. Please ensure your API key is configured.";
      }

      const doCall = async (m: string, timeoutMs: number): Promise<string> => {
        if (currentProvider === "gemini") {
          m = "gemini-2.5-flash";
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const completion = await openai.chat.completions.create(
            {
              model: m,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
            },
            { signal: controller.signal },
          );
          return completion.choices[0]?.message?.content || "";
        } finally {
          clearTimeout(timer);
        }
      };

      try {
        return await doCall(chosenModel, 15000);
      } catch (firstErr) {
        const firstMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
        console.warn("[AIService] First attempt failed, retrying:", firstMessage);
        try {
          return await doCall(chosenModel, 20000);
        } catch {
          console.error("[AIService] Retry also failed");
          return `I'm having a bit of trouble thinking right now. Let's try again in a moment.`;
        }
      }
    }
  }

  static async generateJSON(
    prompt: string,
    schema?: Record<string, unknown>,
    model?: string,
  ): Promise<Record<string, unknown>> {
    try {
      const ai = await getAI();
      return await ai.generateJSON(prompt, schema, { model });
    } catch {
      const systemPrompt =
        "You are a specialized assistant that returns ONLY valid JSON. No markdown, no commentary.";

      try {
        const text = await this.generateCompletion(prompt, systemPrompt, model);
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned);
      } catch (error) {
        console.error("[AIService] JSON generation error:", error);
        return schema || { error: "Failed to generate valid JSON" };
      }
    }
  }
}
