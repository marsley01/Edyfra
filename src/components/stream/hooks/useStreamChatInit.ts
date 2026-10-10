"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StreamChat } from "stream-chat";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";
import { STREAM_KEY, MENTION_REGEX, MASH_AI_USER_ID } from "../styles/constants";
import type { MashAIMentionMeta } from "../types";
import { useStream } from "../StreamChatProvider";

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
  const { isConnected: providerConnected, userId: providerUserId } = useStream();

  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const clientRef = useRef<StreamChat | null>(null);
  const initOnceRef = useRef<string | null>(null);
  const connectingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // Subscription for the @mash listener; must be removed before re-subscribing
  // (retry) and on unmount, otherwise each retry adds another listener and a
  // single mention triggers several AI replies.
  const mentionSubRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Stable serialization for memberIds in the dep array
  const memberIdsKey = JSON.stringify(memberIds);

  const init = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setError(null);
    setIsRetrying(true);
    try {
      console.log(`[useStreamChatInit] Initializing chat for user: ${userId}, channel: ${channelId}`);

      const client = StreamChat.getInstance(STREAM_KEY);

      // Stream users are keyed by the PRISMA id. Some pages pass the Supabase
      // auth id, which differs for older accounts, so the id we connect as
      // always comes from the server together with its token.
      const getSession = async (): Promise<{ token: string; userId: string }> => {
        try {
          const res = await fetch("/api/stream/token", { method: "POST", signal: ctrl.signal });
          if (!res.ok) throw new Error(`token endpoint ${res.status}`);
          const data = await res.json();
          if (typeof data?.token !== "string" || typeof data?.userId !== "string") {
            throw new Error("bad token response");
          }
          return { token: data.token, userId: data.userId };
        } catch (err) {
          if (ctrl.signal.aborted) throw err;
          console.warn("[useStreamChatInit] token endpoint failed, trying server action", err);
          // Only valid when `userId` already is the Stream id (it throws otherwise)
          return { token: await getStreamToken(userId), userId };
        }
      };

      let streamUserId = client.userID ?? null;
      if (streamUserId !== userId && !connectingRef.current) {
        connectingRef.current = true;
        try {
          const session = await getSession();
          if (client.userID !== session.userId) {
            // Connected as someone else (e.g. the auth id of an older account)
            if (client.userID) await client.disconnectUser();
            await client.connectUser(
              { id: session.userId, name: userName, image: userImage || undefined },
              session.token,
            );
            console.log(`[useStreamChatInit] Chat connected: ${session.userId}`);
          }
          streamUserId = session.userId;
        } finally {
          connectingRef.current = false;
        }
      }
      const me = streamUserId ?? userId;

      try {
        await upsertStreamUser(me, userName, userImage || undefined);
      } catch (err) {
        console.warn("[useStreamChatInit] upsertStreamUser non-fatal:", err);
      }

      const allMembers = [
        me,
        ...(memberIds?.filter((m) => m !== me && m !== userId) || []),
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

      mentionSubRef.current?.unsubscribe();
      mentionSubRef.current = c.on("message.new", async (event: any) => {
        const msg = event.message;
        if (!msg || msg.user?.id === MASH_AI_USER_ID) return;
        if (msg.user_id !== me) return; // idempotency — only sender triggers AI

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

  // Run init exactly once per (userId, channelId) when provider is ready.
  useEffect(() => {
    if (providerUserId && !providerConnected) return;

    const key = `${userId}::${channelId}`;
    if (initOnceRef.current === key) return;
    initOnceRef.current = key;
    init();
  }, [userId, channelId, init, providerUserId, providerConnected]);

  // Cleanup: reset the once-key and disconnect on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      mentionSubRef.current?.unsubscribe();
      mentionSubRef.current = null;
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
