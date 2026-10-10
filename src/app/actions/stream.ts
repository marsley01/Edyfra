"use server";

import {
  getServerStreamClient,
  syncUserToStream,
  syncAIUserToStream,
  syncUsersToStream,
  MASH_AI_USER_ID,
} from "@/lib/user-sync";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";
import { resolveStreamViewer } from "@/lib/video/viewer";

/**
 * The signed-in user's Stream identity. Stream users are keyed by the PRISMA
 * id, which differs from the Supabase auth id for some older accounts.
 * (Not exported: every export of this "use server" file is browser-callable.)
 */
async function requireViewer() {
  const viewer = await resolveStreamViewer();
  if (!viewer) throw new Error("Unauthorized");
  return viewer;
}

/**
 * Members of `group_<id>` channels, from the database (never from the
 * caller): a matched study Session (id or roomId) or a StruggleGroup.
 */
async function groupChannelMembers(groupId: string): Promise<{ members: string[]; name: string | null } | null> {
  const session = await prisma.session.findFirst({
    where: { OR: [{ id: groupId }, { roomId: groupId }] },
    select: { studentId: true, partnerId: true, subject: true },
  });
  if (session) {
    return {
      members: [session.studentId, session.partnerId].filter((m): m is string => !!m && m !== MASH_AI_USER_ID),
      name: session.subject || null,
    };
  }
  const group = await prisma.struggleGroup.findUnique({
    where: { id: groupId },
    select: { members: true, name: true },
  });
  if (group) return { members: group.members.filter((m) => m !== MASH_AI_USER_ID), name: group.name };
  return null;
}

/**
 * The server Stream client uses the API secret and bypasses all channel
 * permissions, so every action must check the caller's membership itself.
 * Returns true/false for an existing channel, or null if it doesn't exist.
 */
async function isChannelMember(channelId: string, userId: string): Promise<boolean | null> {
  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
  try {
    const res = await client.channel("messaging", channelId).queryMembers({ user_id: userId });
    return res.members.length > 0;
  } catch (err: any) {
    if (/does not exist|not found|404/i.test(String(err?.message || ""))) return null;
    throw err;
  }
}

/**
 * `group_<id>` channel ids: Stream allows at most 64 characters, and the id
 * part must look like a database id (no separators that could collide with
 * other channel naming schemes such as `dm_`).
 */
const GROUP_ID_RE = /^[A-Za-z0-9-]{1,58}$/;
function parseGroupId(raw: unknown): string | null {
  return typeof raw === "string" && GROUP_ID_RE.test(raw) ? raw : null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN" || u?.role === "FOUNDER";
}

// ─── Token Generation ─────────────────────────────────────────────────────────
/**
 * Generates a Stream chat token for the authenticated user.
 *
 * Runs the centralized User Profile Sync pipeline first so Stream has the
 * freshest name + avatar before the client connects.
 */
export async function getStreamToken(userId: string) {
  // The token must be for the Stream (Prisma) id. A caller passing the auth
  // id of an older account would connectUser() as the wrong user, so reject
  // it; clients should take `userId` from POST /api/stream/token instead.
  const viewer = await requireViewer();
  if (viewer.id !== userId) throw new Error("Unauthorized");

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  console.log("[Stream] Token generated for user: %s", userId);
  
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
  const viewer = await requireViewer();
  if (userId !== viewer.id && userId !== viewer.authId) throw new Error("Unauthorized");

  await syncUserToStream(viewer.id);
}

// ─── Channel Creation ─────────────────────────────────────────────────────────
/**
 * Creates or connects to an existing `group_<id>` Stream channel.
 * Uses watch() so if it already exists, it connects without duplicating it.
 *
 * The server client bypasses Stream permissions, so channel ids are limited
 * to `group_<id>` and the member list comes from the database (the `members`
 * argument is only checked, never trusted): otherwise any user could pull
 * arbitrary users into a channel, or squat a legitimate group's channel id.
 */
export async function createStreamChannel(
  channelId: string,
  members: string[],
  name?: string
) {
  const viewer = await requireViewer();
  const groupId =
    typeof channelId === "string" && channelId.startsWith("group_")
      ? parseGroupId(channelId.slice("group_".length))
      : null;
  if (!groupId || !Array.isArray(members)) throw new Error("Unauthorized");

  const group = await groupChannelMembers(groupId);
  if (!group) throw new Error("Unauthorized");
  const callerId = group.members.includes(viewer.id)
    ? viewer.id
    : group.members.includes(viewer.authId)
      ? viewer.authId
      : null;
  if (!callerId) throw new Error("Unauthorized");
  if (members.some((m) => !group.members.includes(m))) throw new Error("Unauthorized");
  // Don't let a caller "create" (and thereby watch) somebody else's channel
  if ((await isChannelMember(channelId, callerId)) === false) throw new Error("Unauthorized");

  const dbMembers = group.members;
  await syncUsersToStream(dbMembers);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  try {
    const channelName = group.name || name;
    const channel = client.channel("messaging", channelId, {
      members: dbMembers,
      created_by_id: callerId,
      ...(channelName ? { name: channelName } : {}),
    } as any);

    await channel.watch();
    console.log("[Stream] Channel ready: %s", channelId);
    return channelId;
  } catch (err) {
    console.error("[Stream] Failed to create/watch channel %s:", channelId, err);
    throw err;
  }
}

// ─── Member Management ────────────────────────────────────────────────────────
export async function addMembersToChannel(
  channelId: string,
  members: string[]
) {
  const viewer = await requireViewer();
  if (typeof channelId !== "string" || !channelId) throw new Error("Unauthorized");
  if (!Array.isArray(members) || members.length === 0) throw new Error("Unauthorized");

  // Non-admins may only add themselves (see joinGroup), and only to a study
  // group channel they belong to in the database or a channel they're already
  // in. Adding other people requires an admin.
  const isSelf = members.every((m) => m === viewer.id || m === viewer.authId);
  if (!isSelf) {
    if (!(await isAdmin(viewer.id))) throw new Error("Unauthorized");
  } else {
    const groupId = channelId.startsWith("group_") ? parseGroupId(channelId.slice("group_".length)) : null;
    const group = groupId ? await groupChannelMembers(groupId) : null;
    const inGroup = !!group && members.every((m) => group.members.includes(m));
    if (!inGroup && (await isChannelMember(channelId, members[0])) !== true) {
      throw new Error("Unauthorized");
    }
  }

  await syncUsersToStream(members);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
  const channel = client.channel("messaging", channelId);
  await channel.addMembers(members);
  console.log("[Stream] Added members %s to %s", members.join(", "), channelId);
}

export async function removeMembersFromChannel(
  channelId: string,
  members: string[]
) {
  const viewer = await requireViewer();
  if (!Array.isArray(members) || members.length === 0) throw new Error("Unauthorized");
  // Users may remove themselves (either id); removing others requires an admin
  const onlySelf = members.every((m) => m === viewer.id || m === viewer.authId);
  if (!onlySelf && !(await isAdmin(viewer.id))) throw new Error("Unauthorized");

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
  const legacy = `dm_${sorted[0]}_${sorted[1]}`;
  // Stream rejects channel ids over 64 characters. Two cuid ids fit (and
  // existing chats use that form), but two 36-char UUIDs make 76, so every DM
  // between newer accounts failed. Those get a stable hash instead.
  if (legacy.length <= 64) return legacy;
  return `dm_${createHash("sha256").update(`${sorted[0]}:${sorted[1]}`).digest("hex").slice(0, 40)}`;
}

export async function createDMChannel(userAId: string, userBId: string) {
  // Stream users are keyed by Prisma id, which differs from the auth id for
  // some older/OAuth accounts.
  const callerId = (await requireViewer()).id;
  if (callerId !== userAId && callerId !== userBId) throw new Error("Unauthorized");
  if (userAId === userBId) throw new Error("Cannot message yourself");

  const target = await prisma.user.findUnique({
    where: { id: callerId === userAId ? userBId : userAId },
    select: { id: true },
  });
  if (!target) throw new Error("User not found");

  const channelId = await getDMChannelId(userAId, userBId);

  await syncUsersToStream([userAId, userBId]);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");
  const channel = client.channel("messaging", channelId, {
    members: [userAId, userBId],
    created_by_id: callerId,
  } as any);

  await channel.watch();
  console.log("[Stream] DM channel ready: %s", channelId);
  return channelId;
}

// ─── Group Sessions ───────────────────────────────────────────────────────────
/**
 * Creates or connects to a group channel for a study session.
 * Channel ID format: group_<sessionId>
 *
 * Members are loaded from the database (Session participants or
 * StruggleGroup members) and the caller must be one of them; `memberIds` is
 * kept for call-site compatibility but is not trusted.
 */
export async function createGroupChannel(
  sessionId: string,
  _memberIds: string[],
  subjectName: string
) {
  const viewer = await requireViewer();
  if (!parseGroupId(sessionId)) throw new Error("Unauthorized");

  const group = await groupChannelMembers(sessionId);
  if (!group) throw new Error("Unauthorized");
  const callerId = group.members.includes(viewer.id)
    ? viewer.id
    : group.members.includes(viewer.authId)
      ? viewer.authId
      : null;
  if (!callerId) throw new Error("Unauthorized");

  const channelId = `group_${sessionId}`;
  const existing = await isChannelMember(channelId, callerId);
  if (existing === false) throw new Error("Unauthorized");

  const memberIds = group.members;
  await syncUsersToStream([...memberIds, MASH_AI_USER_ID]);

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  const channel = client.channel("messaging", channelId, {
    members: [...memberIds, MASH_AI_USER_ID],
    name: group.name || subjectName,
    created_by_id: callerId,
  } as any);

  await channel.watch();
  console.log(
    `[Stream] Group channel ready: ${channelId} (${memberIds.length} members)`
  );
  return channelId;
}

// ─── Channel Deletion ─────────────────────────────────────────────────────────
export async function deleteStreamChannel(channelId: string) {
  const viewer = await requireViewer();
  // Roles live on the Prisma row, so check the Prisma id
  if (!(await isAdmin(viewer.id))) throw new Error("Unauthorized");

  const client = getServerStreamClient();
  if (!client) throw new Error("Stream not configured");

  try {
    const channel = client.channel("messaging", channelId);
    await channel.delete();
    console.log("[Stream] Deleted channel: %s", channelId);
  } catch (err) {
    console.error("[Stream] Failed to delete channel %s:", channelId, err);
    throw err;
  }
}

// ─── Recent DM Partners ───────────────────────────────────────────────────────
export async function getRecentDMPartners(requestedUserId: string) {
  // Callers may pass either id; channels are always keyed by the Prisma id
  const viewer = await requireViewer();
  if (requestedUserId !== viewer.id && requestedUserId !== viewer.authId) throw new Error("Unauthorized");
  const userId = viewer.id;

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
  const viewer = await requireViewer();
  const user = { id: viewer.authId };
  // The reply is posted with server privileges, so the caller must belong to
  // the (existing) channel under their Stream id; a channel that doesn't
  // exist yet would otherwise be created by the server with the caller in it.
  const member =
    (await isChannelMember(channelId, viewer.id)) === true ||
    (viewer.authId !== viewer.id && (await isChannelMember(channelId, viewer.authId)) === true);
  if (!member) throw new Error("Unauthorized");

  const prompt = messageText
    .replace(/@(?:Mash|AI|mash|ai|mash-ai|MASH)\b/gi, "")
    .trim();

  // Import AIService dynamically to avoid circular deps
  const { AIService } = await import("@/utils/ai-service");
  const { buildMashPromptBundle } = await import("@/utils/mash-context");

  let systemPrompt: string;
  let userContextBlock: string;
  try {
    const bundle = await buildMashPromptBundle(
      user.id,
      sessionSubject,
      sessionTopic,
      sessionTier
    );
    systemPrompt = bundle.systemPrompt;
    userContextBlock = bundle.userContext;
  } catch {
    systemPrompt =
      "You are Mash, a study companion built into Edyfra for Kenyan students. Be encouraging, professional, and clear. Guide the student with questions and hints instead of giving final answers.";
    userContextBlock = `[Session Context] Subject: ${sessionSubject} | Topic: ${sessionTopic || "General"} | Session type: ${sessionTier === "MASH" ? "One-on-one AI tutoring" : "Study group with human participants"}`;
  }

  const contextPrefix = `${userContextBlock}\n\n`;
  const actualPrompt = prompt
    ? `${contextPrefix}${prompt}`
    : `${contextPrefix}Greet me and ask how you can help with ${sessionSubject}${sessionTopic ? ` (${sessionTopic})` : ""}.`;

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
    await syncSessionParticipants(viewer.id);

    const client = getServerStreamClient();
    if (!client) throw new Error("Stream not configured");
    const channel = client.channel("messaging", channelId, {
      members: [viewer.id, MASH_AI_USER_ID],
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
