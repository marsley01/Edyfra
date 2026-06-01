import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

let openaiInstance: OpenAI | null = null;
let geminiInstance: GoogleGenerativeAI | null = null;

function getOpenAI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://edyfra.space",
        "X-Title": "Edyfra",
      },
    });
  }
  return openaiInstance;
}

function getGemini() {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) return null;

  if (!geminiInstance) {
    geminiInstance = new GoogleGenerativeAI(apiKey);
  }
  return geminiInstance;
}

export class AIService {
  static async generateCompletion(
    prompt: string,
    systemPrompt: string = "You are an expert educational assistant.",
    model: string = DEFAULT_OPENROUTER_MODEL
  ): Promise<string> {
    const openai = getOpenAI();
    const gemini = getGemini();

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (content) return content;

        console.warn("[AIService] OpenRouter returned empty response");
      } catch (error) {
        console.error("[AIService] OpenRouter generation error:", error instanceof Error ? error.message : error);
      }
    } else {
      console.warn("[AIService] OPENROUTER_API_KEY is missing. Trying Gemini fallback.");
    }

    if (gemini) {
      try {
        const modelClient = gemini.getGenerativeModel({
          model: DEFAULT_GEMINI_MODEL,
        });
        const result = await modelClient.generateContent(
          `${systemPrompt}\n\nUser request:\n${prompt}`
        );
        const text = result.response.text().trim();
        if (text) return text;

        console.warn("[AIService] Gemini returned empty response");
      } catch (error) {
        console.error("[AIService] Gemini generation error:", error instanceof Error ? error.message : error);
      }
    }

    if (!openai && !gemini) {
      return "AI services are currently offline. Please ensure your AI keys are configured.";
    }

    return "I'm having a bit of trouble thinking right now. Let's try again in a moment.";
  }

  static async generateJSON<T>(
    prompt: string,
    schema?: T,
    model: string = DEFAULT_OPENROUTER_MODEL
  ): Promise<T> {
    const systemPrompt = "You are a specialized assistant that returns ONLY valid JSON. No markdown, no commentary.";

    try {
      const text = await this.generateCompletion(prompt, systemPrompt, model);
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error("[AIService] JSON generation error:", error);
      return (schema || { error: "Failed to generate valid JSON" }) as T;
    }
  }
}
