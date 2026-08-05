import type { GenerativeModel } from "@google/generative-ai";
import { getGeminiModel } from "@/lib/gemini";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Server-side rate limiter + usage logging for Google Gemini calls.
 *
 * Free-tier constraints we stay below:
 *   - gemini-1.5-flash:   15 RPM / 1500 RPD
 *   - gemini-1.5-flash-8b: 15 RPM / 1500 RPD
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

export const GEMINI_PRIMARY_MODEL = "gemini-1.5-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-1.5-flash-8b";

export const PER_USER_RPM_LIMIT = 12;
export const DAILY_CALL_LIMIT = 1400;

const WINDOW_MS = 60_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [2000, 4000, 8000];

export class GeminiRateLimitError extends Error {
  constructor(message = "AI limit reached. Try again in a few minutes.") {
    super(message);
    this.name = "GeminiRateLimitError";
  }
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
    throw new GeminiRateLimitError();
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
      console.warn("[Gemini] ai_usage_log daily check failed:", error.message);
      return; // Be permissive if the counter table is unavailable.
    }
    if (count !== null && count >= DAILY_CALL_LIMIT) {
      throw new GeminiRateLimitError();
    }
  } catch (err) {
    if (err instanceof GeminiRateLimitError) throw err;
    console.warn("[Gemini] daily limit check error:", err);
  }
}

export async function logGeminiUsage(opts: {
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
    // Logging is best-effort; never fail an AI call because the log failed.
    console.warn("[Gemini] failed to log usage:", err);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function totalTokens(result: Awaited<ReturnType<GenerativeModel["generateContent"]>>): number | null {
  try {
    const usage = result?.response?.usageMetadata;
    if (usage && typeof usage.totalTokenCount === "number") {
      return usage.totalTokenCount;
    }
  } catch {
    // ignore
  }
  return null;
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

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

function toContents(prompt: string) {
  return [{ role: "user", parts: [{ text: prompt }] }];
}

/**
 * Core non-streaming call with:
 *   - per-user + daily rate limiting,
 *   - exponential backoff on 429 (2s → 4s → 8s, max 3 retries),
 *   - graceful fallback to gemini-1.5-flash-8b when flash is rate-limited,
 *   - usage persisted to ai_usage_log.
 */
export async function generateWithGemini(options: CallOptions): Promise<string> {
  const windowKey = options.userId ?? "system";
  assertPerUserLimit(windowKey);
  await assertDailyLimit();

  const systemInstruction = withConcision(options.systemPrompt);
  let usedModel = options.model ?? GEMINI_PRIMARY_MODEL;

  for (let attempt = 0; ; attempt++) {
    try {
      const model = getGeminiModel(usedModel);
      const result = await model.generateContent({
        contents: toContents(options.prompt),
        systemInstruction,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
        },
      });

      const text = result.response.text();
      const tokensUsed = totalTokens(result);

      await logGeminiUsage({
        userId: options.userId,
        model: usedModel,
        tokensUsed,
        feature: options.feature,
      });

      return text;
    } catch (err) {
      const rateLimited =
        err instanceof Error && /429|rate ?limit|resource exhausted/i.test(err.message);

      if (!rateLimited) throw err;

      // Flash exhausted → fall back to the (cheaper, still 15 RPM) 8b model.
      if (usedModel === GEMINI_PRIMARY_MODEL) {
        usedModel = GEMINI_FALLBACK_MODEL;
        await sleep(BACKOFF_MS[0]);
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }

      console.warn("[Gemini] rate limit persisted after backoff — returning graceful error.");
      throw new GeminiRateLimitError();
    }
  }
}

/**
 * Streaming variant. Sets up the stream (respecting rate limits + backoff),
 * yields text chunks as they arrive, then logs usage at the end.
 */
export async function* streamWithGemini(options: CallOptions): AsyncGenerator<string> {
  const windowKey = options.userId ?? "system";
  assertPerUserLimit(windowKey);
  await assertDailyLimit();

  const systemInstruction = withConcision(options.systemPrompt);
  let usedModel = options.model ?? GEMINI_PRIMARY_MODEL;

  for (let attempt = 0; ; attempt++) {
    try {
      const model = getGeminiModel(usedModel);
      const streamResult = await model.generateContentStream({
        contents: toContents(options.prompt),
        systemInstruction,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
        },
      });

      let streamedText = "";
      for await (const chunk of streamResult.stream) {
        const text = chunk.text?.() ?? "";
        if (text) {
          streamedText += text;
          yield text;
        }
      }

      const response = await streamResult.response;
      const tokensUsed =
        response?.usageMetadata?.totalTokenCount ??
        estimateTokens(streamedText);

      await logGeminiUsage({
        userId: options.userId,
        model: usedModel,
        tokensUsed,
        feature: options.feature,
      });

      return;
    } catch (err) {
      const rateLimited =
        err instanceof Error && /429|rate ?limit|resource exhausted/i.test(err.message);

      if (rateLimited && usedModel === GEMINI_PRIMARY_MODEL) {
        usedModel = GEMINI_FALLBACK_MODEL;
        await sleep(BACKOFF_MS[0]);
        attempt++;
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt]);
        attempt++;
        continue;
      }

      throw new GeminiRateLimitError();
    }
  }
}