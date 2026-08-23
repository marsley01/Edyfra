import { streamWithAI, AIRateLimitError } from "@/lib/ai-rate-limiter";
import { createClient } from "@/utils/supabase/server";
import { buildEddySystemPrompt, buildEddyUserContextBlock } from "@/utils/eddy-context";
import { saveAiChatMessage } from "@/app/actions/feedback";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Eddy — the Edyfra site assistant.
 *   POST /api/ai/eddy
 *   { message, path? }
 *
 * Returns Server-Sent Events: `data: {"t":"token"}` chunks then `data: [DONE]`.
 * Resolves the caller's user id server-side for rate limiting and persists the
 * conversation (best-effort) to the AI chat history.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return new Response("Missing message", { status: 400 });
  }
  const currentPath = typeof body?.path === "string" ? body.path : undefined;

  let supabase;
  let user: { id: string; name?: string; role?: string } | null = null;
  try {
    supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      user = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
        role: authUser.user_metadata?.role || "student",
      };
    }
  } catch {
    // Anonymous users can still chat with Eddy.
  }

  let systemPrompt: string;
  let fullMessage: string;
  try {
    systemPrompt = await buildEddySystemPrompt();
    fullMessage = `${buildEddyUserContextBlock({
      name: user?.name,
      role: user?.role,
      currentPath,
    })}\n\n${message}`;
  } catch {
    systemPrompt = "You are Eddy, a friendly helper for the Edyfra learning platform.";
    fullMessage = message;
  }

  // Persist the user's message (best-effort, non-blocking)
  if (user) {
    void saveAiChatMessage({
      bot: "eddy",
      role: "user",
      content: message,
      metadata: { path: currentPath },
    }).catch(() => {});
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of streamWithAI({
          prompt: fullMessage,
          systemPrompt,
          userId: user?.id ?? null,
          feature: "eddy",
          temperature: 0.7,
        })) {
          reply += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: chunk })}\n\n`));
        }
      } catch (err) {
        const errorMessage =
          err instanceof AIRateLimitError
            ? err.message
            : "Sorry, something went wrong on my end. Please try again!";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));

        if (err instanceof AIRateLimitError) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          try { controller.close(); } catch { /* noop */ }
          return;
        }

        reply = "";
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      try { controller.close(); } catch { /* noop */ }

      // Best-effort persistence of Eddy's reply.
      if (user && reply) {
        void saveAiChatMessage({
          bot: "eddy",
          role: "assistant",
          content: reply,
        }).catch(() => {});
        try {
          await prisma.aiConversation.create({
            data: {
              userId: user.id,
              modelUsed: "eddy",
              subject: currentPath || null,
            },
          });
        } catch {
          // Silent — non-critical counter
        }
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
