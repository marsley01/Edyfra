import OpenAI from "openai";

const DEFAULT_MODEL = "deepseek/deepseek-chat";

let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  
  if (!openaiInstance) {
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
    const openai = getOpenAI();
    if (!openai) {
      console.warn("[AIService] OPENROUTER_API_KEY is missing. Returning fallback.");
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
