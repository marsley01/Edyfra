import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIServiceOptions {
  provider: "openai" | "google";
  model?: string;
  systemPrompt: string;
  apiKey?: string;
}

export class AIService {
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private provider: "openai" | "google";
  private model: string;
  private systemPrompt: string;

  constructor(options: AIServiceOptions) {
    this.provider = options.provider;
    this.systemPrompt = options.systemPrompt;

    if (this.provider === "openai") {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const openAiKey = options.apiKey || process.env.OPENAI_API_KEY;
      
      if (openRouterKey && !openAiKey) {
        this.openai = new OpenAI({ 
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: openRouterKey,
          defaultHeaders: {
            "HTTP-Referer": "https://edyfra.com",
            "X-Title": "Edyfra",
          }
        });
        this.model = options.model || "google/gemini-2.5-flash"; // Default fast openrouter model
      } else {
        this.openai = new OpenAI({ apiKey: openAiKey });
        this.model = options.model || "gpt-4o-mini";
      }
    } else {
      this.gemini = new GoogleGenerativeAI(options.apiKey || process.env.GOOGLE_AI_KEY || "");
      this.model = options.model || "gemini-1.5-flash";
    }
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      if (this.provider === "openai" && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: userMessage },
          ],
        });
        return completion.choices[0].message.content || "I'm sorry, I couldn't process that.";
      } 
      
      if (this.provider === "google" && this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: this.model });
        const result = await model.generateContent([
          { text: this.systemPrompt },
          { text: userMessage }
        ]);
        const response = await result.response;
        return response.text();
      }

      throw new Error("Invalid AI configuration");
    } catch (error) {
      console.error("AI Generation Error:", error);
      return "I'm having trouble thinking right now. Please try again later.";
    }
  }
}
