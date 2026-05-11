"use client";

import { useEffect, useRef } from "react";
import { StreamChat } from "stream-chat";

interface UseModerationOptions {
  client: StreamChat | null;
  channelId: string;
  currentUserId: string;
}

export function useModeration({ client, channelId, currentUserId }: UseModerationOptions) {
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!client) return;

    const channel = client.channel("messaging", channelId);

    const handleMessage = async (event: any) => {
      const message = event.message;
      if (!message?.text) return;
      if (message.user?.id === "mash-ai") return;
      if (message.user?.id !== currentUserId) return;
      if (checkedRef.current.has(message.id)) return;

      checkedRef.current.add(message.id);

      try {
        await fetch("/api/moderation/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message.text,
            userId: currentUserId,
            sessionId: channelId,
            messageId: message.id,
          }),
        });
      } catch {}
    };

    channel.on("message.new", handleMessage);

    return () => {
      channel.off("message.new", handleMessage);
    };
  }, [client, channelId, currentUserId]);
}
