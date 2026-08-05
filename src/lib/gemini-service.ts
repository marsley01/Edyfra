import {
  generateWithGemini,
  GeminiRateLimitError,
} from "@/lib/gemini-rate-limiter";

interface JsonCallOptions {
  prompt: string;
  systemPrompt?: string;
  userId?: string | null;
  feature: string;
  model?: string;
  temperature?: number;
}

/**
 * Run a Gemini completion that must produce strict JSON.
 * Returns the parsed value. On a rate-limit hit it throws GeminiRateLimitError
 * so the caller can surface the graceful "AI limit reached" message.
 */
export async function generateJSONWithGemini(
  options: JsonCallOptions
): Promise<unknown> {
  const systemPrompt =
    options.systemPrompt ??
    "You are a specialized assistant that returns ONLY valid JSON. No markdown, no commentary.";

  const text = await generateWithGemini({
    prompt: options.prompt,
    systemPrompt,
    userId: options.userId,
    feature: options.feature,
    model: options.model,
    temperature: options.temperature ?? 0.5,
    maxOutputTokens: 1536,
  });

  return parseJSONFromText(text);
}

/**
 * Locate and parse the first JSON object/array inside a longer model reply
 * so we can tolerate the model wrapping output in prose.
 */
export function parseJSONFromText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const braceStart = candidate.indexOf("{");
  const bracketStart = candidate.indexOf("[");
  const start =
    bracketStart !== -1 && (braceStart === -1 || bracketStart < braceStart)
      ? bracketStart
      : braceStart;
  if (start === -1) throw new Error("No JSON found in AI response");
  const snippet = candidate.slice(start);
  return JSON.parse(snippet);
}

export { GeminiRateLimitError };