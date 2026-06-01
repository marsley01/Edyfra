"use client";

import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { StreamChat } from "stream-chat";
import { getStreamToken } from "@/app/actions/stream";
import { createClient } from "@/utils/supabase/client";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";

polyfillClipboard();

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;

interface StreamContextValue {
  client: StreamChat | null;
  userId: string | null;
  isConnected: boolean;
  reconnect: () => Promise<void>;
}

const StreamContext = createContext<StreamContextValue>({
  client: null,
  userId: null,
  isConnected: false,
  reconnect: async () => {},
});

export function useStream() {
  return useContext(StreamContext);
}

/**
 * Global Stream Chat provider — creates ONE singleton client per session.
 * Use StreamChatRoom for the actual chat UI; this provider manages connection state.
 *
 * Note: If you are using StreamChatRoom standalone (not nested inside this provider),
 * it manages its own singleton via StreamChat.getInstance() and this provider is optional.
 */
export function StreamChatProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Use a ref to track the client so the cleanup function always has the latest value
  const clientRef = useRef<StreamChat | null>(null);
  const initRef = useRef(false);

  const connect = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    try {
      console.log(`[StreamProvider] Connecting user: ${user.id}`);

      let token: string;
      try {
        token = await getStreamToken(user.id);
      } catch (actionErr) {
        console.warn("[StreamProvider] Server action failed, trying HTTP:", actionErr);
        const res = await fetch("/api/stream/token", { method: "POST" });
        if (!res.ok) throw new Error("Stream token fetch failed");
        const data = await res.json();
        token = data.token;
      }

      // getInstance ensures only ONE client exists for this API key
      const chatClient = StreamChat.getInstance(STREAM_KEY);

      // Only call connectUser if not already connected
      if (chatClient.userID !== user.id) {
        await chatClient.connectUser(
          {
            id: user.id,
            name:
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            image: user.user_metadata?.avatar || undefined,
          },
          token
        );
        console.log(`[StreamProvider] Connected: ${user.id}`);
      } else {
        console.log(`[StreamProvider] Already connected: ${user.id}`);
      }

      clientRef.current = chatClient;
      setClient(chatClient);
      setIsConnected(true);
    } catch (err) {
      console.error("[StreamProvider] Connection failed:", err);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    connect();

    return () => {
      // Use ref to avoid stale closure — client state may not be set yet
      const activeClient = clientRef.current;
      if (activeClient && activeClient.userID) {
        console.log("[StreamProvider] Disconnecting user on cleanup");
        activeClient.disconnectUser().catch((err) =>
          console.warn("[StreamProvider] Disconnect error:", err)
        );
        setIsConnected(false);
      }
    };
  }, [connect]);

  return (
    <StreamContext.Provider
      value={{ client, userId, isConnected, reconnect: connect }}
    >
      {children}
    </StreamContext.Provider>
  );
}
