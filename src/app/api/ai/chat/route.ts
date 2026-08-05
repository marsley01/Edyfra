import { NextResponse } from "next/server";
import {
  streamWithGemini,
  generateWithGemini,
  GeminiRateLimitError,
} from "@/lib/gemini-rate-limiter";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Generic Gemini chat endpoint used by the client-side AI features.
 *   POST /api/ai/chat
 *   { prompt, systemPrompt?, feature?, stream?: boolean, temperature?, maxTokens? }
 *
 * - The authenticated user's id is resolved server-side for rate limiting.
 * - All Gemini SDK calls stay in this handler / the shared rate-limiter lib.
 * - When `stream` is true the response is Server-Sent Events:
 *     data: {"t":"token"}  ...  data: [DONE]
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Unauthenticated requests are allowed; they share the "system" bucket.
  }

  const feature =
    typeof body?.feature === "string" && body.feature ? body.feature : "chat";

  const options = {
    prompt,
    systemPrompt: typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
    userId,
    feature,
    temperature: typeof body?.temperature === "number" ? body.temperature : undefined,
    maxOutputTokens: typeof body?.maxTokens === "number" ? body.maxTokens : undefined,
  };

  try {
    if (body?.stream === true) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let text = "";
          try {
            for await (const chunk of streamWithGemini(options)) {
              text += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ t: chunk })}\n\n`)
              );
            }
          } catch (err) {
            const message =
              err instanceof GeminiRateLimitError
                ? err.message
                : "AI responded with an error. Please try again.";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
            );
          }
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch {
            // stream already closed
          }
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const text = await generateWithGemini(options);
    return NextResponse.json({ reply: text });
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 }
      );
    }
    console.error("[api/ai/chat] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong processing your request." },
      { status: 500 }
    );
  }
}