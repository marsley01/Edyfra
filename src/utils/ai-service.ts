import OpenAI from "openai";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Create OpenAI client pointing to OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY || "missing-key",
  defaultHeaders: {
    "HTTP-Referer": "https://edyfra.space",
    "X-Title": "Edyfra",
  },
});

const DEFAULT_MODEL = "meta-llama/llama-3-8b-instruct:free";

export class AIService {
  static async generateCompletion(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
    if (!OPENROUTER_API_KEY) {
      console.warn("[AIService] OPENROUTER_API_KEY is missing. Returning fallback.");
      return "AI automation requires an OpenRouter API Key in environment variables.";
    }

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[AIService] Generation error:", error);
      throw error;
    }
  }

  static async generateJSON(prompt: string, schema?: any, model: string = DEFAULT_MODEL): Promise<any> {
    const jsonPrompt = `${prompt}\n\nReturn ONLY valid JSON. Do not include markdown blocks like \`\`\`json.`;
    
    try {
      const text = await this.generateCompletion(jsonPrompt, model);
      // Try to parse the result as JSON
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("[AIService] JSON generation error:", error);
      throw error;
    }
  }
}
