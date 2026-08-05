import { NextResponse } from "next/server";
import {
  generateWithGemini,
  GeminiRateLimitError,
} from "@/lib/gemini-rate-limiter";
import { createClient } from "@/utils/supabase/server";
import {
  getServerStreamClient,
  syncUserToStream,
  syncAIUserToStream,
  MASH_AI_USER_ID,
} from "@/lib/user-sync";

export const runtime = "nodejs";

/**
 * Mash — the AI study companion inside study rooms.
 *   POST /api/ai/mash
 *   { channelId, message, subject?, topic?, tier? }
 *
 * Detects an @Mash mention client-side, then this handler:
 *   1. resolves the caller via the Supabase session (rate limiting by user),
 *   2. generates a guided-tutor reply with Gemini,
 *   3. posts the reply back onto the Stream channel as `mash-ai`,
 *   4. persists the exchange (best-effort).
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { channelId, message, subject, topic, session } = body ?? {};
  if (!channelId || typeof channelId !== "string") {
    return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
  }
  const messageText = typeof message === "string" ? message : "";
  const sessionSubject = typeof subject === "string" ? subject : "General";
  const sessionTopic = typeof topic === "string" ? topic : undefined;
  const sessionTier = typeof session?.tier === "string" ? session.tier : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prompt = messageText
    .replace(/@(?:Mash|AI|mash|ai|mash-ai|MASH)\b/gi, "")
    .trim();

  let studentContextPrompt = "";
  try {
    const { buildMashSystemPrompt } = await import("@/utils/mash-context");
    studentContextPrompt = await buildMashSystemPrompt(user.id, sessionSubject);
  } catch {
    studentContextPrompt = `The student is studying ${sessionSubject}. Be encouraging and helpful.`;
  }

  const systemPrompt = `
    ${studentContextPrompt}
    Session Context:
    - Subject: ${sessionSubject}
    - Topic: ${sessionTopic || "General"}
    - Session Type: ${sessionTier === "MASH" ? "One-on-one AI tutoring" : "Study group with human participants"}

    Guidelines:
    - Be encouraging, professional, and clear.
    - Do NOT just give the final answer. Guide the student with questions and hints.
    - Use standard Kenyan English (professional tone).
    - If they ask something outside of ${sessionSubject}, gently remind them to stay on topic.
  `;

  const actualPrompt =
    prompt ||
    `Greet me and ask how you can help with ${sessionSubject}${sessionTopic ? ` (${sessionTopic})` : ""}.`;

  // Persist the user's Mash mention (best-effort, non-blocking)
  void (async () => {
    try {
      const { saveAiChatMessage } = await import("@/app/actions/feedback");
      await saveAiChatMessage({
        bot: "mash",
        role: "user",
        content: messageText,
        metadata: { channelId, subject: sessionSubject, topic: sessionTopic, tier: sessionTier },
      });
    } catch {
      // silent
    }
  })();

  let aiResponse: string;
  try {
    aiResponse = await generateWithGemini({
      prompt: actualPrompt,
      systemPrompt,
      userId: user.id,
      feature: "mash",
      temperature: 0.7,
    });

    if (!aiResponse || typeof aiResponse !== "string" || aiResponse.trim().length === 0) {
      aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. Could you tell me what specific topic or question you're working on?`;
    }
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      aiResponse = `Hey, I hit my limit for the day. Try again in a few minutes! 🕒`;
    } else {
      console.error("[api/ai/mash] AI generation failed:", err);
      aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. What would you like to work on today?`;
    }
  }

  // Send response as mash-ai on the channel
  try {
    await Promise.all([syncUserToStream(user.id), syncAIUserToStream()]);

    const client = getServerStreamClient();
    if (!client) {
      return NextResponse.json({ error: "Stream not configured" }, { status: 500 });
    }
    const channel = client.channel("messaging", channelId, {
      members: [user.id, MASH_AI_USER_ID],
    } as any);

    try {
      await channel.create();
    } catch (createErr: any) {
      const msg = String(createErr?.message || "");
      if (!/already exists/i.test(msg)) {
        console.error("[api/ai/mash] Failed to ensure channel:", createErr);
        return NextResponse.json({ error: "Failed to post Mash AI reply" }, { status: 500 });
      }
    }

    await channel.sendMessage({
      text: aiResponse,
      user_id: MASH_AI_USER_ID,
    });
  } catch (channelErr) {
    console.error("[api/ai/mash] Failed to send Stream message:", channelErr);
    return NextResponse.json({ error: "Failed to send Mash AI response" }, { status: 500 });
  }

  // Persist Mash's reply (best-effort, non-blocking)
  void (async () => {
    try {
      const { saveAiChatMessage } = await import("@/app/actions/feedback");
      await saveAiChatMessage({
        bot: "mash",
        role: "assistant",
        content: aiResponse,
        metadata: { channelId, subject: sessionSubject, topic: sessionTopic },
      });
    } catch {
      // silent
    }
  })();

  return NextResponse.json({ success: true });
}