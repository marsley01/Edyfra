"use server";

import { StreamChat } from "stream-chat";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

// ─── Singleton Server Client ──────────────────────────────────────────────────
// One instance per serverless function invocation is safe; getInstance ensures
// the same instance is reused within the same process.
let serverClient: StreamChat | null = null;

function getServerClient() {
  if (!serverClient) {
    if (!STREAM_KEY || !STREAM_SECRET) {
      throw new Error(
        "[Stream] NEXT_PUBLIC_STREAM_KEY or STREAM_SECRET is not set in environment variables"
      );
    }
    serverClient = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
  }
  return serverClient;
}

// ─── Token Generation ─────────────────────────────────────────────────────────
/**
 * Generates a Stream chat token for the authenticated user.
 * Also upserts the user into Stream so they exist before the client connects.
 */
export async function getStreamToken(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();

  // Upsert user BEFORE generating token — Stream requires the user to exist
  await client.upsertUser({
    id: userId,
    name:
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    image: user.user_metadata?.avatar || undefined,
    role: "user",
  });

  // Ensure mash-ai user exists in Stream (required for channel membership)
  try {
    await client.upsertUser({
      id: "mash-ai",
      name: "Mash AI",
      role: "user",
    });
  } catch {
    // Non-blocking — mash-ai might already exist
  }

  console.log(`[Stream] Token generated for user: ${userId}`);
  return client.createToken(userId);
}

// ─── Upsert User ──────────────────────────────────────────────────────────────
export async function upsertStreamUser(
  userId: string,
  name: string,
  image?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();
  await client.upsertUser({
    id: userId,
    name,
    image: image || undefined,
    role: "user",
  });
}

// ─── Channel Creation ─────────────────────────────────────────────────────────
/**
 * Creates or connects to an existing Stream channel.
 * Uses watch() so if it already exists, it connects without duplicating it.
 */
export async function createStreamChannel(
  channelId: string,
  members: string[],
  name?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();

  try {
    const channel = client.channel("messaging", channelId, {
      members,
      created_by_id: user.id,
      ...(name ? { name } : {}),
    } as any);

    // watch() creates the channel if it doesn't exist, or connects if it does
    await channel.watch();
    console.log(`[Stream] Channel ready: ${channelId}`);
    return channelId;
  } catch (err) {
    console.error(`[Stream] Failed to create/watch channel ${channelId}:`, err);
    throw err;
  }
}

// ─── Member Management ────────────────────────────────────────────────────────
export async function addMembersToChannel(
  channelId: string,
  members: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channel = client.channel("messaging", channelId);
  await channel.addMembers(members);
  console.log(`[Stream] Added members ${members.join(", ")} to ${channelId}`);
}

export async function removeMembersFromChannel(
  channelId: string,
  members: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channel = client.channel("messaging", channelId);
  await channel.removeMembers(members);
  console.log(
    `[Stream] Removed members ${members.join(", ")} from ${channelId}`
  );
}

// ─── DM Channels ─────────────────────────────────────────────────────────────
/**
 * Returns a deterministic DM channel ID by sorting user IDs alphabetically.
 * Sorting ensures the same channel is found regardless of who initiates.
 */
export async function getDMChannelId(
  userA: string,
  userB: string
): Promise<string> {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export async function createDMChannel(userAId: string, userBId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channelId = await getDMChannelId(userAId, userBId);

  // Upsert both users so they exist in Stream
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userAId },
      select: { name: true, avatar: true },
    }),
    prisma.user.findUnique({
      where: { id: userBId },
      select: { name: true, avatar: true },
    }),
  ]);

  await Promise.all([
    userA
      ? client.upsertUser({
          id: userAId,
          name: userA.name,
          image: userA.avatar || undefined,
          role: "user",
        })
      : Promise.resolve(),
    userB
      ? client.upsertUser({
          id: userBId,
          name: userB.name,
          image: userB.avatar || undefined,
          role: "user",
        })
      : Promise.resolve(),
  ]);

  // watch() = create if not exists, connect if exists — idempotent
  const channel = client.channel("messaging", channelId, {
    members: [userAId, userBId],
    created_by_id: userAId,
  } as any);

  await channel.watch();
  console.log(`[Stream] DM channel ready: ${channelId}`);
  return channelId;
}

// ─── Group Sessions ───────────────────────────────────────────────────────────
/**
 * Creates or connects to a group channel for a study session.
 * Channel ID format: group_<sessionId>
 */
export async function createGroupChannel(
  sessionId: string,
  memberIds: string[],
  subjectName: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channelId = `group_${sessionId}`;

  const channel = client.channel("messaging", channelId, {
    members: memberIds,
    name: subjectName,
    created_by_id: user.id,
  } as any);

  await channel.watch();
  console.log(
    `[Stream] Group channel ready: ${channelId} (${memberIds.length} members)`
  );
  return channelId;
}

// ─── Channel Deletion ─────────────────────────────────────────────────────────
export async function deleteStreamChannel(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();

  try {
    const channel = client.channel("messaging", channelId);
    await channel.delete();
    console.log(`[Stream] Deleted channel: ${channelId}`);
  } catch (err) {
    console.error(`[Stream] Failed to delete channel ${channelId}:`, err);
    throw err;
  }
}

// ─── Recent DM Partners ───────────────────────────────────────────────────────
export async function getRecentDMPartners(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();
  const filter = { type: "messaging", members: { $in: [userId] } };
  const channels = await client.queryChannels(
    filter,
    { last_message_at: -1 },
    { limit: 20 }
  );

  const partners: { id: string; name: string; channelId: string }[] = [];

  for (const channel of channels) {
    const cid = channel.id;
    if (!cid) continue;

    try {
      const members = await channel.queryMembers({});
      const otherMember = members.members.find(
        (m: any) => m.user_id !== userId
      );
      if (otherMember?.user) {
        partners.push({
          id: otherMember.user_id || "",
          name: otherMember.user.name || otherMember.user_id || "User",
          channelId: cid,
        });
      }
    } catch {
      // Skip channels we can't query
    }
  }

  return partners;
}

// ─── AI User ──────────────────────────────────────────────────────────────────
export async function upsertAIUser() {
  const client = getServerClient();
  await client.upsertUser({
    id: "mash-ai",
    name: "Mash AI",
    image: undefined,
    role: "user",
  });
}

// ─── Mash AI Mention Handler ─────────────────────────────────────────────────
/**
 * Called directly from the client when a user mentions @mash in a session chat.
 * This bypasses the Stream webhook (which requires a public URL) and works
 * in any environment (localhost, preview, production).
 */
export async function handleMashMention(
  channelId: string,
  messageText: string,
  sessionSubject: string,
  sessionTopic?: string,
  sessionTier?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const prompt = messageText
    .replace(/@(?:Mash|AI|mash|ai|mash-ai|MASH)\b/gi, "")
    .trim();

  // Import AIService dynamically to avoid circular deps
  const { AIService } = await import("@/utils/ai-service");
  const { buildMashSystemPrompt } = await import("@/utils/mash-context");

  const studentContextPrompt = await buildMashSystemPrompt(user.id, sessionSubject);

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

  const actualPrompt = prompt || `Greet me and ask how you can help with ${sessionSubject}${sessionTopic ? ` (${sessionTopic})` : ""}.`;

  let aiResponse: string;

  try {
    console.log(`[handleMashMention] Generating AI response for prompt: "${actualPrompt.substring(0, 50)}..."`);
    aiResponse = await AIService.generateCompletion(actualPrompt, systemPrompt);
    console.log(`[handleMashMention] AI response generated successfully: ${aiResponse.substring(0, 100)}`);

    // If AI returned the error message, send a friendly fallback instead
    if (aiResponse.includes("having a bit of trouble thinking") || aiResponse.includes("offline")) {
      console.warn("[handleMashMention] AI returned error message, using fallback");
      aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. Could you tell me what specific topic or question you're working on? I can explain concepts, give practice questions, or help you work through problems step by step.`;
    }
  } catch (err: any) {
    console.error("[handleMashMention] AI generation failed:", err?.message || err);
    console.error("[handleMashMention] Error stack:", err?.stack);
    aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. What would you like to work on today?`;
  }

  // Send response as mash-ai on the channel
  try {
    const client = getServerClient();
    await client.upsertUser({ id: "mash-ai", name: "Mash AI", role: "user" });

    const channel = client.channel("messaging", channelId);
    await channel.sendMessage({
      text: aiResponse,
      user_id: "mash-ai",
    });
  } catch (channelErr) {
    console.error("[handleMashMention] Failed to send Stream message:", channelErr);
    throw new Error("Failed to send Mash AI response");
  }

  return { success: true };
}
