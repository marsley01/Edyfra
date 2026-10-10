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

  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Stream users are keyed by the PRISMA id, which differs from the
      // Supabase auth id for some older accounts. The token endpoint resolves
      // it server-side and returns the id the token was minted for; connect
      // as exactly that id.
      const res = await fetch("/api/stream/token", { method: "POST", signal: ctrl.signal });
      if (!res.ok) throw new Error("Stream token fetch failed");
      const data = await res.json();
      const token: unknown = data?.token;
      const streamUserId: unknown = data?.userId;
      if (typeof token !== "string" || typeof streamUserId !== "string") {
        throw new Error("Stream token response was malformed");
      }
      setUserId(streamUserId);
      console.log(`[StreamProvider] Connecting user: ${streamUserId}`);

      // getInstance ensures only ONE client exists for this API key
      const chatClient = StreamChat.getInstance(STREAM_KEY);

      // Only call connectUser if not already connected as this user
      if (chatClient.userID !== streamUserId) {
        if (chatClient.userID) await chatClient.disconnectUser();
        await chatClient.connectUser(
          {
            id: streamUserId,
            name:
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            image: user.user_metadata?.avatar || undefined,
          },
          token
        );
        console.log(`[StreamProvider] Connected: ${streamUserId}`);
      } else {
        console.log(`[StreamProvider] Already connected: ${streamUserId}`);
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
      abortRef.current?.abort();
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
