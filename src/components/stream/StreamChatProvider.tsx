"use client";

import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { StreamChat, Channel as StreamChannelType, UserResponse } from "stream-chat";
import { Chat, Channel, ChannelHeader, MessageList, MessageComposer, Window, useCreateChatClient } from "stream-chat-react";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";
import { createClient } from "@/utils/supabase/client";
import "stream-chat-react/dist/css/index.css";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;

interface StreamContextValue {
  client: StreamChat | null;
  userId: string | null;
  isConnected: boolean;
}

const StreamContext = createContext<StreamContextValue>({
  client: null,
  userId: null,
  isConnected: false,
});

export function useStream() {
  return useContext(StreamContext);
}

// Stream Chat requires clipboard API — provide safe fallback
if (typeof navigator !== "undefined" && !navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async () => {},
      readText: async () => "",
      write: async () => {},
      read: async () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    },
    writable: false,
    configurable: true,
  });
}

export function StreamChatProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const token = await getStreamToken(user.id);
      const chatClient = StreamChat.getInstance(STREAM_KEY);
      await chatClient.connectUser(
        {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          image: user.user_metadata?.avatar || undefined,
        },
        token
      );

      try {
        await upsertStreamUser(
          user.id,
          user.user_metadata?.name || user.email?.split("@")[0] || "User",
          user.user_metadata?.avatar || undefined
        );
      } catch {}

      setClient(chatClient);
      setIsConnected(true);
    };

    init();

    return () => {
      if (client) {
        client.disconnectUser();
        setIsConnected(false);
      }
    };
  }, []);

  return (
    <StreamContext.Provider value={{ client, userId, isConnected }}>
      {children}
    </StreamContext.Provider>
  );
}
