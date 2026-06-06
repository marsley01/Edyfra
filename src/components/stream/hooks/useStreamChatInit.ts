"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StreamChat } from "stream-chat";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";
import { STREAM_KEY, MENTION_REGEX, MASH_AI_USER_ID } from "../styles/constants";
import type { MashAIMentionMeta } from "../types";

interface UseStreamChatInitParams {
  channelId: string;
  userId: string;
  userName: string;
  userImage?: string;
  memberIds?: string[];
  channelName?: string;
  mashAI?: MashAIMentionMeta;
}

interface UseStreamChatInitReturn {
  chatClient: StreamChat | null;
  channel: any | null;
  error: string | null;
  isRetrying: boolean;
  retry: () => void;
}

/**
 * Owns the StreamChat lifecycle for one (user, channel) pair.
 *
 * Responsibilities:
 *   • Fetch a Stream token (server action first, HTTP fallback).
 *   • Connect the singleton chat client + upsert the user profile (best-effort).
 *   • Create or watch the channel with the right members (always includes Mash AI).
 *   • Wire up the @mash mention listener. CRITICAL: only the SENDER's client
 *     triggers handleMashMention — otherwise every connected client would call
 *     it on message arrival and we'd get duplicate responses.
 *
 * Runs `init` exactly once per (userId, channelId) — earlier code recreated
 * the video client whenever memberIds changed and tore down active calls.
 */
export function useStreamChatInit({
  channelId,
  userId,
  userName,
  userImage,
  memberIds,
  channelName,
  mashAI,
}: UseStreamChatInitParams): UseStreamChatInitReturn {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const clientRef = useRef<StreamChat | null>(null);
  const initOnceRef = useRef<string | null>(null);

  // Stable serialization for memberIds in the dep array
  const memberIdsKey = JSON.stringify(memberIds);

  const init = useCallback(async () => {
    setError(null);
    setIsRetrying(true);
    try {
      console.log(`[useStreamChatInit] Initializing chat for user: ${userId}, channel: ${channelId}`);

      const client = StreamChat.getInstance(STREAM_KEY);

      const getToken = async (): Promise<string> => {
        try {
          return await getStreamToken(userId);
        } catch (err) {
          console.warn("[useStreamChatInit] server-action token failed, trying HTTP", err);
          const res = await fetch("/api/stream/token", { method: "POST" });
          if (!res.ok) throw new Error("Failed to authenticate with chat service");
          const data = await res.json();
          return data.token;
        }
      };

      if (client.userID !== userId) {
        const token = await getToken();
        await client.connectUser(
          { id: userId, name: userName, image: userImage || undefined },
          token,
        );
        console.log(`[useStreamChatInit] Chat connected: ${userId}`);
      }

      try {
        await upsertStreamUser(userId, userName, userImage || undefined);
      } catch (err) {
        console.warn("[useStreamChatInit] upsertStreamUser non-fatal:", err);
      }

      const allMembers = [
        userId,
        ...(memberIds?.filter((m) => m !== userId) || []),
        MASH_AI_USER_ID,
      ];

      const c = client.channel("messaging", channelId, {
        members: allMembers,
      } as any);

      if (channelName) {
        try {
          await c.update({ name: channelName } as any);
        } catch {
          /* name is cosmetic — don't fail init on this */
        }
      }

      await c.watch();
      console.log(`[useStreamChatInit] Channel ready: ${channelId}`);

      clientRef.current = client;
      setChannel(c);
      setChatClient(client);

      c.on("message.new", async (event: any) => {
        const msg = event.message;
        if (!msg || msg.user?.id === MASH_AI_USER_ID) return;
        if (msg.user_id !== userId) return; // idempotency — only sender triggers AI

        const text = msg.text || "";
        if (!MENTION_REGEX.test(text)) return;

        const { handleMashMention } = await import("@/app/actions/stream");
        handleMashMention(
          channelId,
          text,
          mashAI?.subject || "General",
          mashAI?.topic,
          mashAI?.tier,
        ).catch((err) => {
          console.warn("[useStreamChatInit] handleMashMention error:", err);
        });
      });
    } catch (err: any) {
      console.error("[useStreamChatInit] Initialization failed:", err);
      setError(err?.message || "Chat failed to load");
    } finally {
      setIsRetrying(false);
    }
  }, [channelId, userId, userName, userImage, channelName, memberIdsKey, mashAI?.subject, mashAI?.topic, mashAI?.tier]);

  // Run init exactly once per (userId, channelId).
  useEffect(() => {
    const key = `${userId}::${channelId}`;
    if (initOnceRef.current === key) return;
    initOnceRef.current = key;
    init();
  }, [userId, channelId, init]);

  // Cleanup: reset the once-key and disconnect on unmount.
  useEffect(() => {
    return () => {
      initOnceRef.current = null;
      const c = clientRef.current;
      if (c && c.userID) {
        c.disconnectUser().catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  const retry = useCallback(() => {
    initOnceRef.current = null;
    init();
  }, [init]);

  return { chatClient, channel, error, isRetrying, retry };
}
