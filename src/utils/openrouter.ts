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
  const { AIService } = await import("@/utils/ai-service");
  
  const systemPrompt = `You are an expert tutor assistant on the Edyfra platform. 
Subject context: ${subject || "general"}
Topic context: ${topic || "general"}

Provide clear, educational responses appropriate for the academic level. 
Use simple language and include examples where helpful.`;

  try {
    const response = await AIService.generateCompletion(prompt, systemPrompt);
    if (response && !response.includes("having a bit of trouble thinking")) {
      return response;
    }
    throw new Error(response || "Empty response from AI");
  } catch (error) {
    console.error("AI generation failed:", error);
    throw error instanceof Error ? error : new Error("AI generation failed");
  }
}
