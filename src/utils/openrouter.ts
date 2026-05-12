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
  if (!genAI) {
    return "AI service is not configured. Please set GOOGLE_AI_KEY in your environment.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const systemPrompt = `You are an expert tutor assistant on the Edyfra platform. 
Subject context: ${subject || "general"}
Topic context: ${topic || "general"}

Provide clear, educational responses appropriate for the academic level. 
Use simple language and include examples where helpful.`;

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: prompt },
    ]);
    return result.response.text();
  } catch (error) {
    console.error("AI generation error:", error);
    return "I apologize, but I encountered an error generating a response. Please try again.";
  }
}
