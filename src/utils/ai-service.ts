import { getAI } from "@/lib/preflight/instance";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

let openaiInstance: OpenAI | null = null;
let currentKey: string | null = null;

async function getAIKeyFromDB(): Promise<{ key: string | null; provider: string | null }> {
  try {
    const entry = await prisma.platformSettings.findUnique({
      where: { key: "global" },
      select: { value: true },
    });
    const value = entry?.value as Record<string, unknown> | undefined;
    return {
      key: (value?.googleAiKey as string) || null,
      provider: (value?.aiProvider as string) || "openrouter",
    };
  } catch (err) {
    console.error("[AIService] Failed to fetch key from DB:", err);
    return { key: null, provider: null };
  }
}

let currentProvider: string = "openrouter";

async function getOpenAI() {
  let apiKey: string | undefined = process.env.OPENROUTER_API_KEY;
  let provider = "openrouter";

  if (!apiKey) {
    const dbConfig = await getAIKeyFromDB();
    apiKey = dbConfig.key ?? undefined;
    provider = dbConfig.provider || "openrouter";
  }

  if (apiKey?.startsWith("AIzaSy")) {
    provider = "gemini";
  }

  if (!apiKey) return null;

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
              "HTTP-Referer": "https://edyfra-v2.vercel.app",
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
    model: string = DEFAULT_MODEL,
  ): Promise<string> {
    try {
      const ai = await getAI();
      return await ai.generateCompletion(prompt, systemPrompt, { model });
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
        return await doCall(model, 15000);
      } catch (firstErr) {
        const firstMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
        console.warn("[AIService] First attempt failed, retrying:", firstMessage);
        try {
          return await doCall(model, 20000);
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
    model: string = DEFAULT_MODEL,
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
