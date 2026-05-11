import { GoogleGenerativeAI } from "@google/generative-ai";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)", costPer1K: 0 },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Free)", costPer1K: 0 },
  { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (Free)", costPer1K: 0 },
  { id: "microsoft/phi-3.5-mini-instruct:free", label: "Phi-3.5 Mini (Free)", costPer1K: 0 },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Free)", costPer1K: 0 },
  { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5", costPer1K: 0.00015 },
  { id: "google/gemini-pro-1.5", label: "Gemini Pro 1.5", costPer1K: 0.00125 },
  { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B", costPer1K: 0.001 },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", costPer1K: 0.00015 },
  { id: "google/gemini-2.0-pro-exp-02-05:free", label: "Gemini 2.0 Pro (Free)", costPer1K: 0 },
  { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", costPer1K: 0.0025 },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", costPer1K: 0.015 },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", costPer1K: 0.0015 },
  { id: "openai/gpt-4o", label: "GPT-4o", costPer1K: 0.015 },
];

const DEFAULT_SYSTEM_PROMPT = `You are Mash, Edyfra's AI study companion for Kenyan students. You are warm, encouraging, and focused. You only help with academic subjects. You never do homework for students — you guide them to the answer. You adapt your language to the student's education level. You are concise and clear. When a student is struggling, you break the problem into smaller steps. You celebrate small wins.`;

const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";

const GEMINI_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-exp:free": "gemini-2.0-flash-exp",
  "google/gemini-flash-1.5": "gemini-1.5-flash",
  "google/gemini-pro-1.5": "gemini-1.5-pro",
  "google/gemini-2.0-flash-001": "gemini-2.0-flash",
  "google/gemini-2.0-pro-exp-02-05:free": "gemini-2.0-pro-exp-02-05",
};

function getGeminiModel(openRouterModel: string): string {
  return GEMINI_MODEL_MAP[openRouterModel] || "gemini-2.0-flash-exp";
}

function shouldUseGemini(settings: Record<string, any>): boolean {
  const provider = settings.ai_provider as string || "auto";
  if (provider === "gemini") return !!GOOGLE_AI_KEY;
  if (provider === "openrouter") return false;
  return !OPENROUTER_API_KEY && !!GOOGLE_AI_KEY;
}

interface OpenRouterOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  safetySettings?: { blocklist?: string[]; refuseOfftopic?: boolean; safeMode?: boolean };
  userPreferences?: { style?: string; language?: string };
}

export async function getActiveSettings() {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const settings = await prisma.platformSettings.findMany({
      where: { key: { in: ["active_ai_model", "ai_provider", "mash_system_prompt", "safety_blocklist", "refuse_offtopic", "safe_mode_under18", "max_response_tokens"] } }
    });
    const map: Record<string, any> = {};
    for (const s of settings) map[s.key] = s.value;
    return map;
  } catch {
    return {};
  }
}

export async function generateAIResponse(
  userMessage: string,
  subject?: string,
  topic?: string,
  options?: OpenRouterOptions
): Promise<string> {
  const settings = await getActiveSettings();
  const model = options?.model || (settings.active_ai_model as string) || DEFAULT_MODEL;
  let systemPrompt = options?.systemPrompt || (settings.mash_system_prompt as string) || DEFAULT_SYSTEM_PROMPT;

  if (subject) {
    systemPrompt += `\n\nThe student is asking about: ${subject}${topic ? ` - ${topic}` : ""}.`;
  }

  if (options?.userPreferences) {
    const { style, language } = options.userPreferences;
    if (style === "short") systemPrompt += "\nKeep responses short and direct.";
    else if (style === "socratic") systemPrompt += "\nAsk the student questions to guide them rather than giving answers.";
    if (language === "kiswahili") systemPrompt += "\nRespond in Kiswahili where appropriate.";
  }

  const maxTokens = (options?.maxTokens ?? (settings.max_response_tokens as number) ?? 500);
  const blocklist = (settings.safety_blocklist as string[]) || [];
  const refuseOfftopic = options?.safetySettings?.refuseOfftopic ?? (settings.refuse_offtopic as boolean) ?? false;
  const safeMode = options?.safetySettings?.safeMode ?? (settings.safe_mode_under18 as boolean) ?? false;

  if (refuseOfftopic) {
    systemPrompt += "\nOnly answer academic questions. Politely redirect anything else.";
  }
  if (safeMode) {
    systemPrompt += "\nApply extra safety filtering for younger students.";
  }

  let text: string;
  let tokenCount = 0;

  try {
    if (shouldUseGemini(settings)) {
      const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY!);
      const geminiModelName = getGeminiModel(model);
      const geminiModel = genAI.getGenerativeModel({
        model: `models/${geminiModelName}`,
        systemInstruction: systemPrompt,
      });
      const result = await geminiModel.generateContent(userMessage);
      text = result.response.text();
      tokenCount = Math.ceil(text.length / 4);
    } else {
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.vercel.app",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter error:", response.status, errText);
        return "Mash is taking a break — try again in a moment.";
      }

      const data = await response.json();
      text = data.choices?.[0]?.message?.content || "";
      tokenCount = data.usage?.total_tokens || 0;
    }

    try {
      const { default: prisma } = await import("@/lib/prisma");
      await prisma.aiConversation.create({
        data: {
          modelUsed: model,
          subject: subject || null,
          tokenCount,
          costEstimate: tokenCount * ((AVAILABLE_MODELS.find(m => m.id === model)?.costPer1K || 0) / 1000),
        },
      });
    } catch {}

    if (blocklist.length > 0) {
      const lower = text.toLowerCase();
      for (const word of blocklist) {
        if (lower.includes(word.toLowerCase())) {
          return "I'm unable to respond to that. Please ask an academic question.";
        }
      }
    }

    return text;
  } catch (error) {
    console.error("AI error:", error);
    return "Mash is taking a break — try again in a moment.";
  }
}

export async function generateAIResponseStream(
  userMessage: string,
  subject?: string,
  topic?: string,
  options?: OpenRouterOptions
): Promise<ReadableStream<Uint8Array>> {
  const settings = await getActiveSettings();
  const model = options?.model || (settings.active_ai_model as string) || DEFAULT_MODEL;
  let systemPrompt = options?.systemPrompt || (settings.mash_system_prompt as string) || DEFAULT_SYSTEM_PROMPT;

  if (subject) {
    systemPrompt += `\n\nThe student is asking about: ${subject}${topic ? ` - ${topic}` : ""}.`;
  }

  const maxTokens = (options?.maxTokens ?? (settings.max_response_tokens as number) ?? 500);

  let streamResponse: Response | null = null;

  if (shouldUseGemini(settings)) {
    const text = await generateAIResponse(userMessage, subject, topic, options);
    return new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  streamResponse = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.vercel.app",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!streamResponse.ok) {
    throw new Error("OpenRouter stream request failed");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = streamResponse.body?.getReader();

  if (!reader) throw new Error("No response body");

  return new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

          for (const line of lines) {
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices?.[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                controller.enqueue(encoder.encode(content));
              }
            } catch {}
          }
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        try {
          const { default: prisma } = await import("@/lib/prisma");
          await prisma.aiConversation.create({
            data: {
              modelUsed: model,
              subject: subject || null,
              tokenCount: Math.ceil(fullText.length / 4),
              costEstimate: 0,
            },
          });
        } catch {}
        controller.close();
      }
    },
  });
}
