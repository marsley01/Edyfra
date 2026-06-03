"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { 
  StreamVideoClient, 
  StreamVideo, 
  StreamCall,
  User
} from "@stream-io/video-react-sdk";
import { VideoCallUI } from "./VideoCallUI";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";

import "stream-chat-react/dist/css/index.css";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";
import { Loader2, RefreshCw, Video, VideoOff, Maximize2, X, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

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
    tier?: string;
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
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ call: any; from: string } | null>(null);
  const clientRef = useRef<StreamChat | null>(null);
  const videoClientRef = useRef<StreamVideoClient | null>(null);
  const { resolvedTheme } = useTheme();
  const chatTheme = resolvedTheme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light";
  const init = useCallback(async () => {
    setError(null);
    setIsRetrying(true);

    try {
      console.log(`[StreamChatRoom] Initializing for user: ${userId}, channel: ${channelId}`);

      const client = StreamChat.getInstance(STREAM_KEY);

      let token: string;
      if (client.userID !== userId) {
        try {
          token = await getStreamToken(userId);
        } catch (tokenErr: any) {
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

        console.log(`[StreamChatRoom] Chat connected: ${userId}`);
      } else {
        console.log(`[StreamChatRoom] User already connected: ${userId}`);
        try {
          token = await getStreamToken(userId);
        } catch (tokenErr: any) {
          const res = await fetch("/api/stream/token", { method: "POST" });
          if (!res.ok) throw new Error("Failed to authenticate with video service");
          const data = await res.json();
          token = data.token;
        }
      }

      // Always create video client — fixes "Start Call" being a no-op for returning users
      if (!videoClientRef.current) {
        const vClient = new StreamVideoClient({
          apiKey: STREAM_KEY,
          user: {
            id: userId,
            name: userName,
            image: userImage || undefined,
          },
          token,
        });
        videoClientRef.current = vClient;
        setVideoClient(vClient);
        console.log(`[StreamChatRoom] Video client created: ${userId}`);
      }

      try {
        await upsertStreamUser(userId, userName, userImage || undefined);
      } catch (upsertErr) {
        console.warn("[StreamChatRoom] upsertStreamUser non-fatal:", upsertErr);
      }

      const allMembers = [
        userId,
        ...(memberIds?.filter((m) => m !== userId) || []),
        "mash-ai",
      ];

      const c = client.channel("messaging", channelId, {
        members: allMembers,
      } as any);

      if (channelName) {
        try {
          await c.update({ name: channelName } as any);
        } catch {}
      }

      await c.watch();
      console.log(`[StreamChatRoom] Channel ready: ${channelId}`);

      clientRef.current = client;
      setChannel(c);
      setChatClient(client);

      // ─── Client-side @mash handler ─
      c.on("message.new", async (event) => {
        const msg = event.message;
        if (!msg || msg.user?.id === "mash-ai") return;

        const text = msg.text || "";
        const mentionRegex = /@(?:Mash|AI|mash|ai|mash-ai|MASH)\b/;
        if (!mentionRegex.test(text)) return;

        const { handleMashMention } = await import("@/app/actions/stream");
        handleMashMention(
          channelId,
          text,
          mashAI?.subject || "General",
          mashAI?.topic,
          mashAI?.tier
        ).catch((err) =>
          console.warn("[StreamChatRoom] handleMashMention error:", err)
        );
      });

      // ─── Auto-detect & watch for incoming calls ─
      const vc = videoClientRef.current;
      if (vc) {
        const { calls } = await vc.queryCalls({
          filter_conditions: {
            id: { $eq: channelId },
          },
        });

        if (calls.length > 0) {
          const call = calls[0];
          setHasActiveCall(true);
          setActiveCall(call);
        }
      }
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
      const client = clientRef.current;
      if (client && client.userID) {
        console.log("[StreamChatRoom] Disconnecting chat user on unmount");
        client.disconnectUser().catch((err) =>
          console.warn("[StreamChatRoom] Chat disconnect error:", err)
        );
      }

      const vClient = videoClientRef.current;
      if (vClient) {
        console.log("[StreamChatRoom] Disconnecting video client on unmount");
        vClient.disconnectUser().catch((err) =>
          console.warn("[StreamChatRoom] Video disconnect error:", err)
        );
      }
    };
  }, [init]);

  // Listen for call events once videoClient is available
  useEffect(() => {
    if (!videoClient) return;

    const unsubscribe = videoClient.on("all", async (event: any) => {
      if (event.call?.id === channelId) {
        if (event.type === "call.ring") {
          setIncomingCall({ call: event.call, from: event.user?.name || "Someone" });
        } else if (event.type === "call.created" || event.type === "call.session_started") {
          setHasActiveCall(true);
          setIncomingCall(null);
          const call = videoClient.call("default", channelId);
          setActiveCall(call);
        } else if (event.type === "call.ended") {
          setHasActiveCall(false);
          setIsVideoActive(false);
          setIncomingCall(null);
          setActiveCall(null);
        }
      }
    });

    return () => unsubscribe();
  }, [videoClient, channelId]);

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
      <div className="flex flex-col items-center justify-center h-full gap-8 bg-background absolute inset-0 z-50">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin [animation-duration:3s]" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full m-2 backdrop-blur-sm">
            <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
          </div>
          {/* Glowing effect behind */}
          <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
        </div>
        <div className="space-y-3 text-center z-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground animate-pulse">
            Connecting to Room
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Securing End-to-End Encryption...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full edyfra-chat-wrapper flex flex-col overflow-hidden">
      <style>{`
        /* --- Dark Theme Overrides --- */
        .str-chat__theme-dark {
          --str-chat__primary-color: var(--primary, #06B6D4);
          --str-chat__background-core-elevation-0: transparent;
          --str-chat__background-core-elevation-1: rgba(10, 10, 10, 0.4);
          --str-chat__background-core-elevation-2: rgba(17, 17, 17, 0.6);
          --str-chat__background-core-elevation-3: rgba(26, 26, 26, 0.8);
          --str-chat__background-core-elevation-4: rgba(34, 34, 34, 0.9);
          --str-chat__font-family: var(--font-sans), system-ui;
          --str-chat__radius-md: 20px;
          --str-chat__radius-lg: 32px;
          --str-chat__text-primary: #ffffff;
          --str-chat__text-secondary: #94a3b8;
          --str-chat__border-radius-circle: 50%;
        }
        
        /* --- Light Theme Overrides --- */
        .str-chat__theme-light {
          --str-chat__primary-color: var(--primary, #06B6D4);
          --str-chat__background-core-elevation-0: transparent;
          --str-chat__background-core-elevation-1: rgba(255, 255, 255, 0.8);
          --str-chat__background-core-elevation-2: rgba(248, 250, 252, 0.9);
          --str-chat__font-family: var(--font-sans), system-ui;
          --str-chat__radius-md: 20px;
          --str-chat__radius-lg: 32px;
          --str-chat__text-primary: #0f172a;
          --str-chat__text-secondary: #64748b;
          --str-chat__border-radius-circle: 50%;
        }

        /* Glassmorphism for the Container */
        .edyfra-chat-wrapper {
          background: var(--background, #050505);
          position: relative;
        }

        /* Message List Container */
        .str-chat__theme-dark .str-chat__message-list,
        .str-chat__theme-light .str-chat__message-list {
          background: var(--background, transparent);
          padding: 1.5rem;
          scrollbar-width: thin;
        }
        .str-chat__theme-dark .str-chat__message-list {
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .str-chat__theme-light .str-chat__message-list {
          scrollbar-color: rgba(0,0,0,0.1) transparent;
        }

        /* Date Separator */
        .str-chat__theme-dark .str-chat__date-separator-line { border-color: rgba(255,255,255,0.05); }
        .str-chat__theme-light .str-chat__date-separator-line { border-color: rgba(0,0,0,0.05); }
        
        .str-chat__theme-dark .str-chat__date-separator-date,
        .str-chat__theme-light .str-chat__date-separator-date {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #64748b;
        }
        
        /* Message Bubbles - High End Style */
        .str-chat__message-simple-text-inner {
          border-radius: 1.75rem !important;
          padding: 0.85rem 1.35rem !important;
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.6;
          position: relative;
        }
        
        /* Outgoing Messages (Me) */
        .str-chat__theme-dark .str-chat__message--me .str-chat__message-simple-text-inner,
        .str-chat__theme-light .str-chat__message--me .str-chat__message-simple-text-inner {
          background: linear-gradient(135deg, var(--primary, #06B6D4) 0%, #0891b2 100%) !important;
          color: white;
          border-bottom-right-radius: 6px !important;
        }
        .str-chat__theme-dark .str-chat__message--me .str-chat__message-simple-text-inner {
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .str-chat__theme-light .str-chat__message--me .str-chat__message-simple-text-inner {
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 10px 30px -10px rgba(6, 182, 212, 0.3);
        }

        /* Incoming Messages (Others) */
        .str-chat__theme-dark .str-chat__message--regular .str-chat__message-simple-text-inner {
          background: #111111 !important;
          border: 1px solid rgba(255,255,255,0.05);
          border-bottom-left-radius: 6px !important;
          color: #e2e8f0;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .str-chat__theme-light .str-chat__message--regular .str-chat__message-simple-text-inner {
          background: #f1f5f9 !important;
          border: 1px solid rgba(0,0,0,0.05);
          border-bottom-left-radius: 6px !important;
          color: #0f172a;
          box-shadow: 0 5px 15px -5px rgba(0,0,0,0.05);
        }

        /* Message Metadata (Time/Status) */
        .str-chat__message-simple__timestamp {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.5;
        }

        /* Input Area - Futuristic Glass */
        .str-chat__theme-dark .str-chat__message-input {
          background: rgba(5, 5, 5, 0.8);
          backdrop-blur: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 1.25rem;
        }
        .str-chat__theme-light .str-chat__message-input {
          background: rgba(255, 255, 255, 0.8);
          backdrop-blur: 12px;
          border-top: 1px solid rgba(0,0,0,0.05);
          padding: 1.25rem;
        }

        .str-chat__theme-dark .str-chat__message-input-inner {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .str-chat__theme-light .str-chat__message-input-inner {
          background: #f8fafc;
          border: 1px solid rgba(0,0,0,0.08);
        }

        .str-chat__message-input-inner {
          border-radius: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 4px;
        }

        .str-chat__theme-dark .str-chat__message-input-inner:focus-within {
          border-color: var(--primary, #06B6D4);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 30px -10px rgba(6, 182, 212, 0.3);
        }
        .str-chat__theme-light .str-chat__message-input-inner:focus-within {
          border-color: var(--primary, #06B6D4);
          background: #ffffff;
          box-shadow: 0 0 30px -10px rgba(6, 182, 212, 0.2);
        }

        .str-chat__textarea {
          background: transparent;
          font-size: 0.95rem;
          padding: 12px 16px;
        }
        .str-chat__theme-dark .str-chat__textarea { color: #ffffff; }
        .str-chat__theme-light .str-chat__textarea { color: #0f172a; }
        
        /* Header - Minimalist */
        .str-chat__theme-dark .str-chat__header-livestream {
          background: rgba(10, 10, 10, 0.8);
          backdrop-blur: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 1.25rem 2rem;
        }
        .str-chat__theme-light .str-chat__header-livestream {
          background: rgba(255, 255, 255, 0.8);
          backdrop-blur: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 1.25rem 2rem;
        }

        .str-chat__header-livestream-left-title {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .str-chat__theme-dark .str-chat__header-livestream-left-title { color: #ffffff; }
        .str-chat__theme-light .str-chat__header-livestream-left-title { color: #0f172a; }

        /* Custom Scrollbar for Edyfra */
        .edyfra-chat-wrapper ::-webkit-scrollbar {
          width: 4px;
        }
        .edyfra-chat-wrapper ::-webkit-scrollbar-track {
          background: transparent;
        }
        .edyfra-chat-wrapper ::-webkit-scrollbar-thumb {
          background: rgba(128,128,128,0.2);
          border-radius: 10px;
        }
        .edyfra-chat-wrapper ::-webkit-scrollbar-thumb:hover {
          background: var(--primary, #06B6D4);
        }

        .video-call-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          background: #000;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <Chat client={chatClient} theme={chatTheme}>
        <StreamVideo client={videoClient!}>
          <div className="flex flex-col h-full relative">
            {/* Custom Premium Header */}
            {!hideHeader && (
              <div className="flex items-center justify-between px-6 py-4 bg-background/50 backdrop-blur-xl border-bottom border-white/5 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                      {channelName || "Study Room"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      {(memberIds?.length ?? 0) + 2} Members{mashAI?.tier !== "MASH" ? (
                        <span className="ml-2 text-emerald-500">· <Sparkles className="inline h-3 w-3 -mt-0.5" /> @Mash AI</span>
                      ) : (
                        <span className="ml-2 text-emerald-500">· <Sparkles className="inline h-3 w-3 -mt-0.5" /> Mash AI</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      const vc = videoClientRef.current;
                      if (!vc) return;
                      try {
                        const call = vc.call("default", channelId);
                        const members = (memberIds || [])
                          .filter((m) => m !== userId)
                          .map((id) => ({ user_id: id }));
                        await call.getOrCreate({
                          ring: true,
                          data: { members: [{ user_id: userId }, ...members] },
                        });
                        await call.join();
                        setActiveCall(call);
                        setIsVideoActive(true);
                        setHasActiveCall(true);
                      } catch (err) {
                        console.error("Failed to start video call:", err);
                      }
                    }}
                    variant={hasActiveCall ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full transition-all ${hasActiveCall ? "bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-secondary hover:bg-primary hover:text-white border-white/5"}`}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {hasActiveCall ? "Join Live Call" : "Start Call"}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 relative overflow-hidden">
              {/* Incoming Call Overlay */}
              {incomingCall && !isVideoActive && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
                  <div className="rounded-2xl bg-zinc-900 border border-white/10 p-8 text-center space-y-6 shadow-2xl">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                      <Video className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Incoming Video Call</p>
                      <p className="text-lg font-bold mt-1">{incomingCall.from}</p>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10 h-12 px-8"
                        onClick={async () => {
                          try {
                            const vc = videoClientRef.current;
                            if (vc && incomingCall.call) {
                              const call = vc.call("default", channelId);
                              await call.reject();
                            }
                          } catch {}
                          setIncomingCall(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-full bg-emerald-500 hover:bg-emerald-600 h-12 px-8"
                        onClick={async () => {
                          try {
                            const vc = videoClientRef.current;
                            if (!vc) return;
                            const call = vc.call("default", channelId);
                            await call.join();
                            setActiveCall(call);
                            setIsVideoActive(true);
                            setHasActiveCall(true);
                            setIncomingCall(null);
                          } catch {}
                        }}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Layer */}
              {isVideoActive && activeCall && (
                <div className="video-call-overlay p-4">
                  <StreamCall call={activeCall}>
                    <VideoCallUI onLeave={() => {
                      setIsVideoActive(false);
                      setActiveCall(null);
                      setHasActiveCall(false);
                    }} />
                  </StreamCall>
                </div>
              )}

              {/* Chat Components */}
              <Channel channel={channel}>
                <Window>
                  <MessageList />
                  <MessageComposer />
                </Window>
                <Thread />
              </Channel>
            </div>
          </div>
        </StreamVideo>
      </Chat>
    </div>
  );
}
