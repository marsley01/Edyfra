import { getAI } from "@/lib/preflight/instance";
import { getAIConfig } from "@/lib/ai-config";
import { getAppUrl } from "@/lib/app-url";
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
              "HTTP-Referer": getAppUrl(),
              "X-Title": "Edyfra",
            }
          : undefined,
    });
  }
  return openaiInstance;
}

function isFailureText(text: string): boolean {
  return /having a bit of trouble thinking|currently offline/i.test(text);
}

let geminiInstance: OpenAI | null = null;

/** Gemini through its OpenAI-compatible endpoint, if GOOGLE_AI_KEY is set. */
function getGeminiClient(): OpenAI | null {
  const key = process.env.GOOGLE_AI_KEY?.trim();
  if (!key) return null;
  if (!geminiInstance) {
    geminiInstance = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: key,
    });
  }
  return geminiInstance;
}

async function chatOnce(
  client: OpenAI,
  model: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs: number,
  maxTokens?: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        // OpenRouter rejects requests whose max_tokens exceeds the remaining
        // credit, so OpenRouter calls pass a modest cap. Gemini passes none:
        // its "thinking" tokens count against the cap and truncated answers.
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      },
      { signal: controller.signal },
    );
    return completion.choices[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

export class AIService {
  static async generateCompletion(
    prompt: string,
    systemPrompt: string = "You are an expert educational assistant.",
    model?: string,
  ): Promise<string> {
    const defaultModel = (await getAIConfig()).model;
    const chosenModel = model ?? defaultModel;
    // 1. The routed provider layer. It reports failure by returning an apology
    //    string rather than throwing, so check for that explicitly; returning
    //    it as-is is what made every AI feature fail when OpenRouter ran out of
    //    credits.
    try {
      const ai = await getAI();
      const text = await ai.generateCompletion(prompt, systemPrompt, { model: chosenModel });
      if (text && !isFailureText(text)) return text;
    } catch {
      // fall through
    }

    // 2. OpenRouter directly (or a Gemini key saved as the main key).
    const openai = await getOpenAI();
    if (openai) {
      try {
        const m = currentProvider === "gemini" ? "gemini-2.5-flash" : chosenModel;
        const text = await chatOnce(openai, m, prompt, systemPrompt, 20000, currentProvider === "gemini" ? undefined : 1500);
        if (text) return text;
      } catch (error) {
        console.warn("[AIService] OpenRouter call failed:", error instanceof Error ? error.message : error);
      }
    }

    // 3. Google Gemini with GOOGLE_AI_KEY. Keeps AI features working when the
    //    OpenRouter account has no credits or is rate-limited.
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const text = await chatOnce(gemini, "gemini-2.5-flash", prompt, systemPrompt, 25000);
        if (text) return text;
      } catch (error) {
        console.warn("[AIService] Gemini fallback failed:", error instanceof Error ? error.message : error);
      }
    }

    if (!openai && !gemini) {
      console.warn("[AIService] No AI key configured. Returning offline message.");
      return "AI services are currently offline. Please ensure your API key is configured.";
    }
    console.error("[AIService] All AI providers failed");
    return `I'm having a bit of trouble thinking right now. Let's try again in a moment.`;
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
