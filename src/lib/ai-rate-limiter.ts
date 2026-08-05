import OpenAI from "openai";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Server-side rate limiter + usage logging for AI calls via OpenRouter.
 *
 * Hard caps implemented here:
 *   - 12 requests per minute per user (sliding window, in-memory Map).
 *   - 1400 requests per day across all users (querying the Supabase
 *     `ai_usage_log` table; buffer below the 1500 RPD ceiling).
 *
 * Usage is persisted to `ai_usage_log` (id, user_id, timestamp, model,
 * tokens_used, feature) so the daily budget survives restarts and is shared
 * across every serverless instance.
 */

export const AI_PRIMARY_MODEL = "google/gemini-2.0-flash-exp:free";
export const AI_FALLBACK_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

export const PER_USER_RPM_LIMIT = 12;
export const DAILY_CALL_LIMIT = 1400;

const WINDOW_MS = 60_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [2000, 4000, 8000];

export class AIRateLimitError extends Error {
  constructor(message = "AI limit reached. Try again in a few minutes.") {
    super(message);
    this.name = "AIRateLimitError";
  }
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-build",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com",
        "X-Title": "Edyfra",
      },
    });
  }
  return openaiClient;
}

/** In-memory sliding window keyed by user id. Serverless-safe; multiple
 *  instances share the DB-backed daily counter for the global budget. */
const perUserWindow = new Map<string, number[]>();

function pruneWindow(userId: string, now: number): void {
  const cutoff = now - WINDOW_MS;
  const timestamps = perUserWindow.get(userId);
  if (!timestamps || timestamps.length === 0) return;
  const pruned = timestamps.filter((t) => t > cutoff);
  if (pruned.length === 0) perUserWindow.delete(userId);
  else perUserWindow.set(userId, pruned);
}

function assertPerUserLimit(userId: string, now = Date.now()): void {
  pruneWindow(userId, now);
  const timestamps = perUserWindow.get(userId) ?? [];
  if (timestamps.length >= PER_USER_RPM_LIMIT) {
    throw new AIRateLimitError();
  }
  timestamps.push(now);
  perUserWindow.set(userId, timestamps);
}

async function assertDailyLimit(): Promise<void> {
  try {
    const admin = createAdminClient();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count, error } = await admin
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .gte("timestamp", dayStart.toISOString());
    if (error) {
      console.warn("[OpenRouter] ai_usage_log daily check failed:", error.message);
      return; // Be permissive if the counter table is unavailable.
    }
    if (count !== null && count >= DAILY_CALL_LIMIT) {
      throw new AIRateLimitError();
    }
  } catch (err) {
    if (err instanceof AIRateLimitError) throw err;
    console.warn("[OpenRouter] daily limit check error:", err);
  }
}

export async function logAIUsage(opts: {
  userId?: string | null;
  model: string;
  tokensUsed?: number | null;
  feature: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_log").insert({
      user_id: opts.userId ?? null,
      timestamp: new Date().toISOString(),
      model: opts.model,
      tokens_used: opts.tokensUsed ?? null,
      feature: opts.feature,
    });
  } catch (err) {
    console.warn("[OpenRouter] failed to log usage:", err);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CallOptions {
  prompt: string;
  systemPrompt?: string;
  userId?: string | null;
  feature: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Append a one-line "stay concise" instruction onto the system prompt. */
function withConcision(systemPrompt?: string): string | undefined {
  const concision =
    "Keep your response concise (under ~150 words unless the user explicitly asks for more detail). Use simple, clear language and stay on topic.";
  return systemPrompt ? `${systemPrompt}\n\n${concision}` : concision;
}

export async function generateWithAI(options: CallOptions): Promise<string> {
  const windowKey = options.userId ?? "system";
  assertPerUserLimit(windowKey);
  await assertDailyLimit();

  const systemInstruction = withConcision(options.systemPrompt);
  let usedModel = options.model ?? AI_PRIMARY_MODEL;

  for (let attempt = 0; ; attempt++) {
    try {
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: options.prompt });

      const response = await getOpenAIClient().chat.completions.create({
        model: usedModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxOutputTokens ?? 1024,
      });

      const text = response.choices[0]?.message?.content || "";
      const tokensUsed = response.usage?.total_tokens || null;

      await logAIUsage({
        userId: options.userId,
        model: usedModel,
        tokensUsed,
        feature: options.feature,
      });

      return text;
    } catch (err) {
      const rateLimited = err instanceof Error && /429|rate ?limit|resource exhausted/i.test(err.message);

      if (!rateLimited) throw err;

      if (usedModel === AI_PRIMARY_MODEL) {
        usedModel = AI_FALLBACK_MODEL;
        await sleep(BACKOFF_MS[0]);
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }

      console.warn("[OpenRouter] rate limit persisted after backoff — returning graceful error.");
      throw new AIRateLimitError();
    }
  }
}

export async function* streamWithAI(options: CallOptions): AsyncGenerator<string> {
  const windowKey = options.userId ?? "system";
  assertPerUserLimit(windowKey);
  await assertDailyLimit();

  const systemInstruction = withConcision(options.systemPrompt);
  let usedModel = options.model ?? AI_PRIMARY_MODEL;

  for (let attempt = 0; ; attempt++) {
    try {
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: options.prompt });

      const stream = await getOpenAIClient().chat.completions.create({
        model: usedModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxOutputTokens ?? 1024,
        stream: true,
      });

      let streamedText = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          streamedText += text;
          yield text;
        }
      }

      await logAIUsage({
        userId: options.userId,
        model: usedModel,
        tokensUsed: Math.ceil(streamedText.length / 4), // rough estimate for streaming
        feature: options.feature,
      });

      return;
    } catch (err) {
      const rateLimited = err instanceof Error && /429|rate ?limit|resource exhausted/i.test(err.message);

      if (rateLimited && usedModel === AI_PRIMARY_MODEL) {
        usedModel = AI_FALLBACK_MODEL;
        await sleep(BACKOFF_MS[0]);
        attempt++;
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt]);
        attempt++;
        continue;
      }

      throw new AIRateLimitError();
    }
  }
}
