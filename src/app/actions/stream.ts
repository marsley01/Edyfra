"use server";

import { createClient } from "@/utils/supabase/server";
import {
  getServerStreamClient,
  syncUserToStream,
  syncAIUserToStream,
  syncUsersToStream,
  MASH_AI_USER_ID,
} from "@/lib/user-sync";

// ─── Token Generation ─────────────────────────────────────────────────────────
/**
 * Generates a Stream chat token for the authenticated user.
 *
 * Runs the centralized User Profile Sync pipeline first so Stream has the
 * freshest name + avatar before the client connects.
 */
export async function getStreamToken(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  console.log(`[Stream] Token generated for user: ${userId}`);
  
  const [token] = await Promise.all([
    Promise.resolve(client.createToken(userId)),
    syncSessionParticipants(userId)
  ]);

  return token;
}

// Helper kept local to this file to avoid pulling it across the action boundary
async function syncSessionParticipants(userId: string) {
  await Promise.all([
    syncUserToStream(userId),
    syncAIUserToStream()
  ]);
}

// ─── Upsert User ──────────────────────────────────────────────────────────────
/**
 * @deprecated Prefer `syncUserToStream` from `@/lib/user-sync`, which resolves
 * the canonical name/avatar from Prisma automatically. This wrapper is kept
 * for back-compat with existing call sites; the `name`/`image` arguments are
 * ignored in favor of the freshest Prisma data.
 */
export async function upsertStreamUser(
  userId: string,
  _name?: string,
  _image?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) throw new Error("Unauthorized");

  await syncUserToStream(userId);
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

  await syncUsersToStream(members);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  try {
    const channel = client.channel("messaging", channelId, {
      members,
      created_by_id: user.id,
      ...(name ? { name } : {}),
    } as any);

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

  await syncUsersToStream(members);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
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

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
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

  const channelId = await getDMChannelId(userAId, userBId);

  await syncUsersToStream([userAId, userBId]);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
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

  await syncUsersToStream([...memberIds, user.id, MASH_AI_USER_ID]);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
  const channelId = `group_${sessionId}`;

  const channel = client.channel("messaging", channelId, {
    members: [...memberIds, MASH_AI_USER_ID],
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

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

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

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
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
  await syncAIUserToStream();
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

  let studentContextPrompt = "";
  try {
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

  const actualPrompt = prompt || `Greet me and ask how you can help with ${sessionSubject}${sessionTopic ? ` (${sessionTopic})` : ""}.`;

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
    } catch (e) {
      // silent
    }
  })();

  let aiResponse: string;

  try {
    aiResponse = await AIService.generateCompletion(actualPrompt, systemPrompt);

    if (!aiResponse || typeof aiResponse !== "string" || aiResponse.trim().length === 0) {
      aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. Could you tell me what specific topic or question you're working on?`;
    }

    if (aiResponse.includes("having a bit of trouble thinking") || aiResponse.includes("offline") || aiResponse.includes("API Key is missing")) {
      aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. Could you tell me what specific topic or question you're working on? I can explain concepts, give practice questions, or help you work through problems step by step.`;
    }
  } catch (err) {
    console.error("[handleMashMention] AI generation failed:", err);
    aiResponse = `Hey! 👋 I'm here to help with ${sessionSubject}. What would you like to work on today? You can ask me about any topic or question.`;
  }

  // Send response as mash-ai on the channel
  try {
    await syncSessionParticipants(user.id);

    const client = getServerStreamClient();
    if (!client) throw new Error("Stream not configured");
    const channel = client.channel("messaging", channelId, {
      members: [user.id, MASH_AI_USER_ID],
    } as any);

    // Ensure the channel exists server-side before sending.
    // The client creates it via c.watch() but the server has its own Channel
    // reference; sendMessage will fail with "channel does not exist" otherwise.
    try {
      await channel.create();
    } catch (createErr: any) {
      // "channel already exists" is fine — anything else we rethrow
      const msg = String(createErr?.message || "");
      if (!/already exists/i.test(msg)) throw createErr;
    }

    await channel.sendMessage({
      text: aiResponse,
      user_id: MASH_AI_USER_ID,
    });
  } catch (channelErr) {
    console.error("[handleMashMention] Failed to send Stream message:", channelErr);
    throw new Error(
      "Failed to send Mash AI response: " +
        (channelErr instanceof Error ? channelErr.message : String(channelErr))
    );
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
    } catch (e) {
      // silent
    }
  })();

  return { success: true };
}
