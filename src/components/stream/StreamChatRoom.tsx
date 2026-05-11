"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Window,
  LoadingIndicator,
  Thread,
} from "stream-chat-react";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";
import { useMashAI } from "./useMashAI";
import "stream-chat-react/dist/css/index.css";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModeration } from "./useModeration";

polyfillClipboard();

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;

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
  const [isRetrying, setIsRetrying] = useState(false);
  const clientRef = useRef<StreamChat | null>(null);

  useMashAI({
    client: chatClient,
    channelId,
    tier: mashAI?.tier || "",
    subject: mashAI?.subject || "",
    topic: mashAI?.topic,
    currentUserId: userId,
    enabled: mashAI?.tier === "MASH",
  });

  useModeration({
    client: chatClient,
    channelId,
    currentUserId: userId,
  });

  const init = useCallback(async () => {
    setError(null);
    setIsRetrying(true);

    try {
      console.log(`[StreamChatRoom] Initializing for user: ${userId}, channel: ${channelId}`);

      // Use singleton — StreamChat.getInstance returns the same instance every time
      // for the same API key, preventing duplicate connections
      const client = StreamChat.getInstance(STREAM_KEY);

      // Only connect if not already connected to avoid duplicate connections
      if (client.userID !== userId) {
        // Token is generated server-side (secret never exposed to browser)
        let token: string;
        try {
          token = await getStreamToken(userId);
        } catch (tokenErr: any) {
          // If token fetch fails with auth error, try the HTTP endpoint as fallback
          console.warn("[StreamChatRoom] Server action token failed, trying HTTP endpoint:", tokenErr);
          const res = await fetch("/api/stream/token", { method: "POST" });
          if (!res.ok) throw new Error("Failed to authenticate with chat service");
          const data = await res.json();
          token = data.token;
        }

        await client.connectUser(
          {
            id: userId,
            name: userName,
            image: userImage || undefined,
          },
          token
        );

        console.log(`[StreamChatRoom] User connected: ${userId}`);
      } else {
        console.log(`[StreamChatRoom] User already connected: ${userId}`);
      }

      // Upsert user in Stream (server-side, idempotent)
      try {
        await upsertStreamUser(userId, userName, userImage || undefined);
      } catch (upsertErr) {
        // Non-fatal — user was already upserted during token generation
        console.warn("[StreamChatRoom] upsertStreamUser non-fatal:", upsertErr);
      }

      // All members including self
      const allMembers = [
        userId,
        ...(memberIds?.filter((m) => m !== userId) || []),
      ];

      // Create or connect to the channel — watch() is idempotent
      const c = client.channel("messaging", channelId, {
        members: allMembers,
      } as any);

      if (channelName) {
        try {
          await c.update({ name: channelName } as any);
        } catch {
          // Non-fatal if update fails (e.g., not channel owner)
        }
      }

      await c.watch();
      console.log(`[StreamChatRoom] Channel ready: ${channelId}`);

      clientRef.current = client;
      setChannel(c);
      setChatClient(client);
    } catch (err: any) {
      console.error("[StreamChatRoom] Initialization failed:", err);
      setError(err.message || "Chat failed to load");
    } finally {
      setIsRetrying(false);
    }
  }, [channelId, userId, userName, userImage, channelName, JSON.stringify(memberIds)]);

  useEffect(() => {
    init();

    return () => {
      // Disconnect only when the component unmounts
      const client = clientRef.current;
      if (client && client.userID) {
        console.log("[StreamChatRoom] Disconnecting user on unmount");
        client.disconnectUser().catch((err) =>
          console.warn("[StreamChatRoom] Disconnect error:", err)
        );
      }
    };
  }, [init]);

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <p className="font-black text-sm uppercase tracking-widest text-foreground">
            Chat failed to load
          </p>
          <p className="text-xs text-muted-foreground font-medium max-w-xs">
            {error}. Refresh to try again.
          </p>
        </div>
        <Button
          onClick={init}
          disabled={isRetrying}
          className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Retry Connection"
          )}
        </Button>
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (!chatClient || !channel) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <LoadingIndicator />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Connecting to chat...
        </p>
      </div>
    );
  }

  // ─── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full edyfra-chat-wrapper">
      <style>{`
        .str-chat__theme-dark {
          --str-chat__primary-color: #06B6D4;
          --str-chat__background-core-elevation-0: #080808;
          --str-chat__background-core-elevation-1: #111827;
          --str-chat__background-core-elevation-2: #1a1a2e;
          --str-chat__background-core-elevation-3: #1e1e3a;
          --str-chat__background-core-elevation-4: #222244;
          --str-chat__font-family: DM Sans, system-ui;
          --str-chat__font-family-geist: DM Sans, system-ui;
          --str-chat__radius-md: 12px;
          --str-chat__radius-lg: 16px;
          --str-chat__text-primary: #ffffff;
          --str-chat__text-secondary: #94a3b8;
        }
        .str-chat__theme-dark .str-chat__message-list {
          background: #111827;
        }
        .str-chat__theme-dark .str-chat__message-input {
          background: #1a1a2e;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .str-chat__theme-dark .str-chat__message-input-footer {
          background: #1a1a2e;
        }
        .str-chat__theme-dark .str-chat__textarea {
          background: #111827;
        }
        .str-chat__theme-dark .str-chat__message-attachment-card--content {
          background: #1a1a2e;
        }
      `}</style>
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
    </div>
  );
}
