"use server";

import { StreamChat } from "stream-chat";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

let serverClient: StreamChat | null = null;

function getServerClient() {
  if (!serverClient) {
    serverClient = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
  }
  return serverClient;
}

export async function getStreamToken(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();
  return client.createToken(userId);
}

export async function upsertStreamUser(userId: string, name: string, image?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();
  await client.upsertUser({
    id: userId,
    name,
    image: image || undefined,
  });
}

export async function createStreamChannel(channelId: string, members: string[], name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channel = client.channel("messaging", channelId, {
    members,
    created_by_id: user.id,
  } as any);
  if (name) await channel.update({ name } as any);
  await channel.create();
  return channelId;
}

export async function addMembersToChannel(channelId: string, members: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channel = client.channel("messaging", channelId);
  await channel.addMembers(members);
}

export async function getDMChannelId(userA: string, userB: string) {
  const sorted = [userA, userB].sort();
  return `dm-${sorted[0]}-${sorted[1]}`;
}

export async function createDMChannel(userAId: string, userBId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channelId = getDMChannelId(userAId, userBId);

  // Upsert both users
  const userA = await prisma.user.findUnique({ where: { id: userAId }, select: { name: true, avatar: true } });
  const userB = await prisma.user.findUnique({ where: { id: userBId }, select: { name: true, avatar: true } });
  const streamClient = getServerClient();
  if (userA) await streamClient.upsertUser({ id: userAId, name: userA.name, image: userA.avatar || undefined });
  if (userB) await streamClient.upsertUser({ id: userBId, name: userB.name, image: userB.avatar || undefined });

  // Create or get the channel
  const channel = client.channel("messaging", channelId, {
    members: [userAId, userBId],
    created_by_id: userAId,
  } as any);
  await channel.create();
  return channelId;
}

export async function deleteStreamChannel(channelId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const client = getServerClient();
  const channel = client.channel("messaging", channelId);
  await channel.delete();
}

export async function getRecentDMPartners(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const client = getServerClient();
  const filter = { type: "messaging", members: { $in: [userId] } };
  const channels = await client.queryChannels(filter, { last_message_at: -1 }, { limit: 20 });

  const partners: { id: string; name: string; channelId: string }[] = [];

  for (const channel of channels) {
    const cid = channel.id;
    if (!cid) continue;

    try {
      const members = await channel.queryMembers({});
      const otherMember = members.members.find((m: any) => m.user_id !== userId);
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

export async function upsertAIUser() {
  const client = getServerClient();
  await client.upsertUser({
    id: "mash-ai",
    name: "Mash AI",
    image: undefined,
  });
}
