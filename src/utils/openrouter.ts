import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", costPer1K: 0 },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)", costPer1K: 0 },
  { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", costPer1K: 0.1 },
  { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro", costPer1K: 0.5 },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", costPer1K: 0.3 },
  { id: "openai/gpt-4o", label: "GPT-4o", costPer1K: 2.5 },
  { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", costPer1K: 0.5 },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", costPer1K: 3.0 },
  { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (Free)", costPer1K: 0 },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Free)", costPer1K: 0 },
];

export async function generateAIResponse(
  prompt: string,
  subject?: string,
  topic?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("AI service is not configured. Please set OPENROUTER_API_KEY in your environment.");
  }

  const systemPrompt = `You are an expert tutor assistant on the Edyfra platform. 
Subject context: ${subject || "general"}
Topic context: ${topic || "general"}

Provide clear, educational responses appropriate for the academic level. 
Use simple language and include examples where helpful.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Edyfra"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.text());
      throw new Error(`OpenRouter API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (content) return content;
    throw new Error("Empty OpenRouter response");
  } catch (error) {
    console.error("OpenRouter error, trying Google AI fallback:", error);
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
        return result.response.text();
      } catch (googleErr) {
        console.error("Google AI fallback failed:", googleErr);
      }
    }
    throw error instanceof Error ? error : new Error("AI generation failed");
  }
}
