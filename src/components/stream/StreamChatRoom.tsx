"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { Chat, Channel, ChannelHeader, MessageList, MessageComposer, Window, LoadingIndicator, Thread } from "stream-chat-react";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";
import { useMashAI } from "./useMashAI";
import "stream-chat-react/dist/css/index.css";

interface StreamChatRoomProps {
  channelId: string;
  userId: string;
  userName: string;
  userImage?: string;
  memberIds?: string[];
  channelName?: string;
  hideHeader?: boolean;
  mashAI?: {
    tier: string;
    subject: string;
    topic?: string;
  };
}

export default function StreamChatRoom({
  channelId,
  userId,
  userName,
  userImage,
  memberIds,
  channelName,
  hideHeader,
  mashAI,
}: StreamChatRoomProps) {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useMashAI({
    client: chatClient,
    channelId,
    tier: mashAI?.tier || "",
    subject: mashAI?.subject || "",
    topic: mashAI?.topic,
    currentUserId: userId,
    enabled: mashAI?.tier === "MASH",
  });

  useEffect(() => {
    let client: StreamChat | null = null;

    const init = async () => {
      try {
        const token = await getStreamToken(userId);
        client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!);
        await client.connectUser(
          { id: userId, name: userName, image: userImage || undefined },
          token
        );

        try {
          await upsertStreamUser(userId, userName, userImage || undefined);
        } catch {}

        const allMembers = [userId, ...(memberIds?.filter(m => m !== userId) || [])];

        const c = client.channel("messaging", channelId, {
          members: allMembers,
        } as any);
        if (channelName) await c.update({ name: channelName } as any);
        await c.watch();
        setChannel(c);
        setChatClient(client);
      } catch (err: any) {
        setError(err.message || "Failed to connect to chat");
      }
    };

    init();

    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [channelId, userId, userName, userImage, channelName, JSON.stringify(memberIds)]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-red-500 font-medium">Chat unavailable: {error}</p>
      </div>
    );
  }

  if (!chatClient || !channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <Chat client={chatClient} theme="str-chat__theme-dark">
      <Channel channel={channel}>
        <Window>
          {!hideHeader && <ChannelHeader />}
          <MessageList />
          <MessageComposer />
        </Window>
        <Thread />
      </Channel>
    </Chat>
  );
}
