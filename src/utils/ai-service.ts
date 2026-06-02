import OpenAI from "openai";
import { getAdminGlobalSettings } from "@/app/actions/admin";

const DEFAULT_MODEL = "deepseek/deepseek-chat";

let openaiInstance: OpenAI | null = null;
let currentKey: string | null = null;

async function getOpenAI() {
  // 1. Try environment variable first
  let apiKey = process.env.OPENROUTER_API_KEY;

  // 2. Fallback to database settings
  if (!apiKey) {
    try {
      const settings = await getAdminGlobalSettings();
      apiKey = settings?.googleAiKey;
    } catch (err) {
      console.error("[AIService] Failed to fetch key from DB:", err);
    }
  }

  if (!apiKey) return null;

  // If the key has changed, re-initialize the instance
  if (!openaiInstance || currentKey !== apiKey) {
    currentKey = apiKey;
    openaiInstance = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://edyfra.space",
        "X-Title": "Edyfra",
      },
    });
  }
  return openaiInstance;
}

export class AIService {
  static async generateCompletion(
    prompt: string,
    systemPrompt: string = "You are an expert educational assistant.",
    model: string = DEFAULT_MODEL
  ): Promise<string> {
    const openai = await getOpenAI();
    if (!openai) {
      console.warn("[AIService] API Key is missing (checked ENV and DB). Returning offline message.");
      return "AI services are currently offline. Please ensure your API key is configured.";
    }
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[AIService] Generation error:", error);
      return "I'm having a bit of trouble thinking right now. Let's try again in a moment.";
    }
  }

  static async generateJSON(
    prompt: string, 
    schema?: any, 
    model: string = DEFAULT_MODEL
  ): Promise<any> {
    const systemPrompt = "You are a specialized assistant that returns ONLY valid JSON. No markdown, no commentary.";
    
    try {
      const text = await this.generateCompletion(prompt, systemPrompt, model);
      // Clean potential markdown artifacts
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("[AIService] JSON generation error:", error);
      // Fallback for JSON structure to prevent crashes
      return schema || { error: "Failed to generate valid JSON" };
    }
  }
}
