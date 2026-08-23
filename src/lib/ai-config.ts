import prisma from "@/lib/prisma";

/**
 * Central AI configuration resolver.
 *
 * Every server-side AI call (chatbots, insights, challenges, institution AI)
 * resolves its OpenRouter credentials through here so that a key saved by an
 * admin in AI Settings takes effect immediately — without waiting for a
 * redeploy to pick up new env vars.
 *
 * Resolution order:
 *   1. `OPENROUTER_API_KEY` env var (set locally / in Vercel)
 *   2. `platformSettings.global.openRouterKey` in the database
 *      (falls back to legacy `googleAiKey`, which the admin UI used to write)
 *
 * The DB lookup is cached for 30s per serverless instance to keep hot paths
 * cheap; saving settings clears it via `invalidateAICache()`.
 */

export const DEFAULT_AI_MODEL = "google/gemini-2.5-flash";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface AIConfig {
  apiKey: string | null;
  model: string;
  source: "env" | "database" | "none";
}

let cache: { config: AIConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateAICache(): void {
  cache = null;
}

async function readSettingsFromDB(): Promise<{
  openRouterKey: string | null;
  googleAiKey: string | null;
  aiModel: string | null;
}> {
  try {
    const entry = await prisma.platformSettings.findUnique({
      where: { key: "global" },
      select: { value: true },
    });
    const value = entry?.value as Record<string, unknown> | undefined;
    return {
      openRouterKey:
        typeof value?.openRouterKey === "string" && value.openRouterKey.trim()
          ? value.openRouterKey.trim()
          : null,
      googleAiKey:
        typeof value?.googleAiKey === "string" && value.googleAiKey.trim()
          ? value.googleAiKey.trim()
          : null,
      aiModel:
        typeof value?.aiModel === "string" && value.aiModel.trim()
          ? value.aiModel.trim()
          : null,
    };
  } catch (err) {
    console.error("[AIConfig] Failed to read platformSettings:", err);
    return { openRouterKey: null, googleAiKey: null, aiModel: null };
  }
}

export async function getAIConfig(): Promise<AIConfig> {
  if (cache && cache.expiresAt > Date.now()) return cache.config;

  let config: AIConfig;
  const envKey = process.env.OPENROUTER_API_KEY?.trim();

  if (envKey) {
    config = {
      apiKey: envKey,
      model: process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL,
      source: "env",
    };
  } else {
    const db = await readSettingsFromDB();
    const dbKey = db.openRouterKey || db.googleAiKey;
    config = {
      apiKey: dbKey,
      model: db.aiModel || DEFAULT_AI_MODEL,
      source: dbKey ? "database" : "none",
    };
  }

  cache = { config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

/** OpenRouter-compatible default headers (attribution is recommended). */
export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com",
    "X-Title": "Edyfra",
  };
}
