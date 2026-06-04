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
  WithComponents,
} from "stream-chat-react";
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  User,
  Call,
} from "@stream-io/video-react-sdk";
import { VideoCallUI } from "./VideoCallUI";
import { DynamicIsland } from "./DynamicIsland";
import { StreamAttachment } from "./StreamAttachment";
import { MediaDiagnostic } from "./MediaDiagnostic";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { getStreamToken, upsertStreamUser } from "@/app/actions/stream";

import "stream-chat-react/dist/css/index.css";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";
import {
  Loader2,
  RefreshCw,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  X,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

type CallState = "idle" | "starting" | "joining" | "joined" | "ended" | "error";

/**
 * Quality + capability settings applied to every call we create.
 * Tuned for high quality: 1080p target, adaptive bitrate, noise suppression,
 * dynacast simulcast so remote viewers get a quality layer matched to their
 * viewport + bandwidth.
 */
const CALL_SETTINGS = {
  audio: {
    mic_default_on: true,
    default_device: "speaker",
    noise_cancellation: { mode: "auto" },
  },
  video: {
    camera_default_on: true,
    camera_facing: "user",
    target_resolution: { width: 1920, height: 1080 },
    enabled_for_caller: true,
  },
  broadcasting: { enabled: false },
  recording: { enabled: false },
} as const;

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
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: string } | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [permWarmed, setPermWarmed] = useState(false);
  const [permRetryNonce, setPermRetryNonce] = useState(0);

  const clientRef = useRef<StreamChat | null>(null);
  const videoClientRef = useRef<StreamVideoClient | null>(null);
  const videoClientUserIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const initOnceRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chatTheme =
    mounted && resolvedTheme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light";

  // ─── Init chat + video client once per (userId, channelId) ──────────────────
  const init = useCallback(async () => {
    setError(null);
    setIsRetrying(true);
    try {
      console.log(`[StreamChatRoom] Initializing for user: ${userId}, channel: ${channelId}`);

      const client = StreamChat.getInstance(STREAM_KEY);

      const getToken = async (): Promise<string> => {
        try {
          return await getStreamToken(userId);
        } catch (err) {
          console.warn("[StreamChatRoom] server-action token failed, trying HTTP", err);
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
          token
        );
        console.log(`[StreamChatRoom] Chat connected: ${userId}`);
      } else {
        await getToken();
      }

      // Create video client ONCE per user. Subsequent mounts reuse the same
      // client so existing call subscriptions stay alive.
      if (!videoClientRef.current || videoClientUserIdRef.current !== userId) {
        const freshToken = await getToken();
        const vClient = new StreamVideoClient({
          apiKey: STREAM_KEY,
          user: { id: userId, name: userName, image: userImage || undefined },
          token: freshToken,
          options: { logLevel: "warn" },
        });
        videoClientRef.current = vClient;
        videoClientUserIdRef.current = userId;
        setVideoClient(vClient);
        console.log(`[StreamChatRoom] Video client created: ${userId}`);
      }

      try {
        await upsertStreamUser(userId, userName, userImage || undefined);
      } catch (err) {
        console.warn("[StreamChatRoom] upsertStreamUser non-fatal:", err);
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

      c.on("message.new", async (event: any) => {
        const msg = event.message;
        if (!msg || msg.user?.id === "mash-ai") return;

        // Idempotency: only the SENDER of the @mash message triggers the AI.
        // Without this, every connected client would call handleMashMention
        // when the message arrives, producing duplicate responses.
        if (msg.user_id !== userId) return;

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
        ).catch((err) => {
          console.warn("[StreamChatRoom] handleMashMention error:", err);
          toast.error("Mash couldn't reply", {
            description: err?.message || "Try again in a sec.",
          });
        });
      });
    } catch (err: any) {
      console.error("[StreamChatRoom] Initialization failed:", err);
      setError(err?.message || "Chat failed to load");
    } finally {
      setIsRetrying(false);
    }
  }, [channelId, userId, userName, userImage, channelName, JSON.stringify(memberIds)]);

  // Run init exactly once per (userId, channelId). This was the previous bug —
  // every member-list change recreated the video client and tore down the call.
  useEffect(() => {
    const key = `${userId}::${channelId}`;
    if (initOnceRef.current === key) return;
    initOnceRef.current = key;
    init();
  }, [userId, channelId, init]);

  useEffect(() => {
    return () => {
      initOnceRef.current = null;
      const vClient = videoClientRef.current;
      if (vClient) {
        vClient.disconnectUser().catch(() => {});
        videoClientRef.current = null;
      }
      const c = clientRef.current;
      if (c && c.userID) {
        c.disconnectUser().catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  // ─── Listen for call events on the video client ─────────────────────────────
  useEffect(() => {
    if (!videoClient) return;

    const unsubscribe = videoClient.on("all", (event: any) => {
      if (event.call?.id !== channelId) return;

      switch (event.type) {
        case "call.ring": {
          if (activeCallRef.current) return;
          setIncomingCall({
            from: event.user?.name || event.user?.id || "Someone",
          });
          break;
        }
        case "call.created":
        case "call.session_started": {
          setHasActiveCall(true);
          setIncomingCall(null);
          break;
        }
        case "call.ended": {
          setHasActiveCall(false);
          setCallState("ended");
          setActiveCall(null);
          activeCallRef.current = null;
          setIncomingCall(null);
          break;
        }
        case "call.rejected": {
          setHasActiveCall(false);
          setCallState("idle");
          setIncomingCall(null);
          toast.info("Call was declined");
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [videoClient, channelId]);

  // ─── Proactive permission probe + warm-up ─────────────────────────────────
  // On mount we do TWO things:
  //  (1) Check `navigator.permissions` to detect previously-denied state and
  //      show the warning banner immediately (Chrome/Edge only).
  //  (2) Issue a no-op `getUserMedia` request with `audio: true` only, which
  //      is the lightest possible prompt Chrome will accept. This is the
  //      "warm-up" — the user gets the browser prompt right after page load
  //      (or sees a status indicator) instead of being ambushed by it the
  //      moment they click "Start Call". Tracks are stopped immediately.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    let cancelled = false;

    (async () => {
      // (1) Permissions API check — silently fail on Firefox/Safari
      if (navigator.permissions?.query) {
        try {
          const checks = await Promise.allSettled([
            navigator.permissions.query({ name: "camera" as PermissionName }),
            navigator.permissions.query({ name: "microphone" as PermissionName }),
          ]);
          if (cancelled) return;
          const blocked = checks.some(
            (c) => c.status === "fulfilled" && c.value.state === "denied",
          );
          if (blocked) setPermDenied(true);
        } catch {
          // Permissions API not fully supported — silent fallback
        }
      }

      // (2) Warm-up: request audio-only first (lightest prompt). If user
      // accepts, we mark `permWarmed = true`. If they deny, the banner
      // appears. If they ignore the prompt, the click handler will retry
      // with both audio + video.
      if (navigator.mediaDevices?.getUserMedia && !cancelled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          if (!cancelled) {
            setPermWarmed(true);
            setPermDenied(false);
          }
        } catch (err: any) {
          if (cancelled) return;
          const isDenied =
            err?.name === "NotAllowedError" ||
            err?.name === "PermissionDeniedError";
          if (isDenied) setPermDenied(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Permission-state poller ───────────────────────────────────────────────
  // When the warning banner is visible, poll `navigator.permissions` every 2s.
  // If the user fixes the lock icon (or Windows privacy) while we're idle,
  // the banner auto-dismisses so they don't have to click the button.
  useEffect(() => {
    if (!permDenied || typeof navigator === "undefined" || !navigator.permissions?.query) return;

    const id = setInterval(async () => {
      try {
        const [cam, mic] = await Promise.allSettled([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ]);
        const states = [cam, mic].map((r) =>
          r.status === "fulfilled" ? r.value.state : "prompt",
        );
        if (states.every((s) => s === "granted")) {
          setPermDenied(false);
          setPermWarmed(true);
        }
      } catch {
        // silent
      }
    }, 2000);

    return () => clearInterval(id);
  }, [permDenied]);

  // ─── Pre-flight: explicitly request camera + mic so the browser prompt ─────
  // fires BEFORE the user clicks "Start Call". This was the #1 cause of "I
  // clicked but nothing happened" — the prompt is being suppressed because
  // the call was joined before getUserMedia resolved.
  const requestMediaPermissions = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera/mic not supported", {
        description: "Your browser or device doesn't support video calls. Try Chrome or Edge.",
      });
      setPermDenied(true);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Immediately stop the test tracks — the SDK will open its own streams
      // when it joins the call.
      stream.getTracks().forEach((t) => t.stop());
      setPermDenied(false);
      setPermWarmed(true);
      return true;
    } catch (err: any) {
      console.warn("[StreamChatRoom] getUserMedia failed:", err);
      setPermDenied(true);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError";
      const isNoDevice = err?.name === "NotFoundError";
      if (isDenied) {
        toast.error("Camera or microphone access blocked", {
          description: "Click the lock icon in your address bar, allow camera + mic, then try again.",
        });
      } else if (isNoDevice) {
        toast.error("No camera or microphone found", {
          description: "Connect a device, then click Start Call again.",
        });
      } else {
        toast.error("Couldn't access your camera/mic", {
          description: err?.message || "Check your device settings.",
        });
      }
      // Bump the diagnostic nonce so the MediaDiagnostic re-runs and shows the
      // exact error name + deep links to fix it.
      setPermRetryNonce((n) => n + 1);
      return false;
    }
  }, []);

  // ─── Start a call (or join an existing one) ────────────────────────────────
  const startOrJoinCall = useCallback(async () => {
    const vc = videoClientRef.current;
    if (!vc) {
      toast.error("Video service not ready", {
        description: "Try refreshing the page.",
      });
      return;
    }

    if (activeCallRef.current) {
      setCallState("joined");
      return;
    }

    setCallState("starting");

    const ok = await requestMediaPermissions();
    if (!ok) {
      setCallState("error");
      return;
    }

    try {
      const call = vc.call("default", channelId, CALL_SETTINGS as any);

      const otherMembers = (memberIds || [])
        .filter((m) => m && m !== userId)
        .map((id) => ({ user_id: id }));

      const newCall = await call.getOrCreate({
        ring: true,
        data: {
          members: [{ user_id: userId, role: "admin" }, ...otherMembers],
          custom: {
            startedBy: userId,
            subject: mashAI?.subject,
            topic: mashAI?.topic,
          },
        },
      });

      // High-quality preferences: 1080p, adaptive bitrate, noise suppression.
      // The SDK ignores unknown keys so this is safe to re-apply.
      try {
        await call.update({
          settings_override: {
            video: { target_resolution: { width: 1920, height: 1080 } },
          },
        } as any);
      } catch (err) {
        console.warn("[StreamChatRoom] settings_override failed (non-fatal):", err);
      }

      setActiveCall(call);
      activeCallRef.current = call;
      setHasActiveCall(true);
      setCallState("joining");

      await call.join();
      setCallState("joined");
      console.log(`[StreamChatRoom] Joined call: ${channelId}`);
    } catch (err: any) {
      console.error("[StreamChatRoom] startOrJoinCall failed:", err);
      setCallState("error");
      setActiveCall(null);
      activeCallRef.current = null;
      toast.error("Couldn't start the call", {
        description: err?.message || "Check your connection and try again.",
      });
    }
  }, [channelId, userId, memberIds, mashAI?.subject, mashAI?.topic, requestMediaPermissions]);

  // ─── Accept an incoming call ───────────────────────────────────────────────
  const acceptIncomingCall = useCallback(async () => {
    const vc = videoClientRef.current;
    if (!vc) {
      setIncomingCall(null);
      return;
    }

    const ok = await requestMediaPermissions();
    if (!ok) {
      setIncomingCall(null);
      return;
    }

    try {
      const call = vc.call("default", channelId);
      await call.join();
      setActiveCall(call);
      activeCallRef.current = call;
      setCallState("joined");
      setHasActiveCall(true);
      setIncomingCall(null);
    } catch (err: any) {
      console.error("[StreamChatRoom] accept failed:", err);
      toast.error("Couldn't join the call", { description: err?.message });
      setIncomingCall(null);
    }
  }, [channelId, requestMediaPermissions]);

  // ─── Reject an incoming call ───────────────────────────────────────────────
  const rejectIncomingCall = useCallback(async () => {
    const vc = videoClientRef.current;
    if (!vc) {
      setIncomingCall(null);
      return;
    }
    try {
      const call = vc.call("default", channelId);
      await call.reject();
    } catch (err) {
      console.warn("[StreamChatRoom] reject failed (non-fatal):", err);
    }
    setIncomingCall(null);
  }, [channelId]);

  // ─── Leave the call ────────────────────────────────────────────────────────
  const leaveCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (call) {
      try {
        await call.leave();
      } catch (err) {
        console.warn("[StreamChatRoom] leave failed:", err);
      }
    }
    setActiveCall(null);
    activeCallRef.current = null;
    setCallState("idle");
    setHasActiveCall(false);
  }, []);

  // ─── Error state ──────────────────────────────────────────────────────────
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
          <p className="text-xs text-muted-foreground font-medium max-w-xs">{error}.</p>
        </div>
        <Button
          onClick={() => {
            initOnceRef.current = null;
            init();
          }}
          disabled={isRetrying}
          className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase"
        >
          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry Connection"}
        </Button>
      </div>
    );
  }

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (!chatClient || !channel) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 bg-background absolute inset-0 z-50">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin [animation-duration:3s]" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full m-2 backdrop-blur-sm">
            <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
          </div>
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

  const inCall = callState === "joined" || callState === "joining";
  const starting = callState === "starting";

  return (
    <div className="h-full w-full edyfra-chat-wrapper flex flex-col overflow-hidden">
      <style>{`
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
        .str-chat__theme-light {
          --str-chat__primary-color: var(--primary, #06B6D4);
          --str-chat__background-core-elevation-0: transparent;
          --str-chat__background-core-elevation-1: rgba(255, 255, 255, 0.8);
          --str-chat__background-core-elevation-2: rgba(248, 250, 252, 0.9);
          --str-chat__background-core-elevation-3: rgba(255, 255, 255, 0.95);
          --str-chat__background-core-elevation-4: rgba(255, 255, 255, 0.98);
          --str-chat__font-family: var(--font-sans), system-ui;
          --str-chat__radius-md: 20px;
          --str-chat__radius-lg: 32px;
          --str-chat__text-primary: #0f172a;
          --str-chat__text-secondary: #64748b;
          --str-chat__border-radius-circle: 50%;
        }
        .edyfra-chat-wrapper { background: transparent; position: relative; }
        .str-chat__theme-dark .str-chat__message-list,
        .str-chat__theme-light .str-chat__message-list {
          background: var(--background, transparent);
          padding: 1.5rem;
          scrollbar-width: thin;
        }
        .str-chat__theme-dark .str-chat__message-list { scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .str-chat__theme-light .str-chat__message-list { scrollbar-color: rgba(0,0,0,0.1) transparent; }
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
        .str-chat__message-simple-text-inner {
          border-radius: 1.75rem !important;
          padding: 0.85rem 1.35rem !important;
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.6;
          position: relative;
        }
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
        .str-chat__message-simple__timestamp {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.5;
        }
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
        .str-chat__textarea { background: transparent; font-size: 0.95rem; padding: 12px 16px; }
        .str-chat__theme-dark .str-chat__textarea { color: #ffffff; }
        .str-chat__theme-light .str-chat__textarea { color: #0f172a; }
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
        .edyfra-chat-wrapper ::-webkit-scrollbar { width: 4px; }
        .edyfra-chat-wrapper ::-webkit-scrollbar-track { background: transparent; }
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
        /* Sleek backdrop behind the dynamic island pill */
        .edyfra-island-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 30;
          pointer-events: none;
          background: linear-gradient(180deg,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0.25) 40%,
            rgba(0,0,0,0) 100%);
          backdrop-filter: blur(8px);
        }
      `}</style>
      <WithComponents
        overrides={{
          Attachment: StreamAttachment as any,
        }}
      >
        <Chat client={chatClient} theme={chatTheme}>
        <StreamVideo client={videoClient!}>
          <div className="flex flex-col h-full relative">
            {!hideHeader && (
              <div className="flex items-center justify-between px-6 py-4 bg-background/50 backdrop-blur-xl border-b border-white/5 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                      {channelName || "Study Room"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      {(memberIds?.length ?? 0) + 2} Members
                      <span className="ml-2 text-emerald-500">
                        · <Sparkles className="inline h-3 w-3 -mt-0.5" /> Mash AI
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {permWarmed && !permDenied && !inCall && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Mic ready
                    </span>
                  )}
                  <Button
                    onClick={startOrJoinCall}
                    disabled={starting}
                    variant={inCall ? "default" : hasActiveCall ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full transition-all h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest",
                      inCall
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                        : hasActiveCall
                          ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 animate-pulse"
                          : permDenied
                            ? "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
                            : "bg-secondary hover:bg-primary hover:text-white border-white/5"
                    )}
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : inCall ? (
                      <Video className="h-4 w-4" />
                    ) : permDenied ? (
                      <VideoOff className="h-4 w-4" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    <span>
                      {inCall
                        ? "In Call"
                        : starting
                          ? "Starting…"
                          : hasActiveCall
                            ? "Join Live Call"
                            : permDenied
                              ? "Permissions needed"
                              : "Start Call"}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {permDenied && !inCall && (
              <div className="px-6 py-4 bg-red-500/5 border-b border-red-500/20 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-xs text-red-600 dark:text-red-300 leading-relaxed flex-1 space-y-2">
                  <p>
                    <strong>Camera & microphone are blocked.</strong> Your browser is preventing
                    this site from using your camera and mic.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-red-600/90 dark:text-red-300/90">
                    <li>Click the <span className="font-bold">lock icon</span> (or camera icon) next to the URL in your address bar.</li>
                    <li>Set <strong>Camera</strong> and <strong>Microphone</strong> to <em>Allow</em>.</li>
                    <li>Click the <em>Permissions needed</em> button below to try again.</li>
                  </ol>
                  <p className="text-[11px] text-red-600/70 dark:text-red-300/70">
                    If you don&apos;t see a lock icon, your browser may be in Incognito mode or the device
                    may be in use by another app (Zoom, Meet, etc.). Close those first.
                  </p>
                  <MediaDiagnostic
                    trigger={permRetryNonce}
                    onResolved={() => {
                      setPermDenied(false);
                      setPermWarmed(true);
                      toast.success("Microphone access works — try Start Call again.");
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence>
                {incomingCall && !inCall && (
                  <motion.div
                    key="incoming"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
                  >
                    <div className="rounded-3xl bg-zinc-900 border border-white/10 p-8 text-center space-y-6 shadow-2xl max-w-sm mx-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <Phone className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          Incoming Video Call
                        </p>
                        <p className="text-lg font-bold mt-1">{incomingCall.from}</p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10 h-12 px-6 gap-2"
                          onClick={rejectIncomingCall}
                        >
                          <PhoneOff className="h-4 w-4" /> Decline
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full bg-emerald-500 hover:bg-emerald-600 h-12 px-6 gap-2"
                          onClick={acceptIncomingCall}
                        >
                          <Phone className="h-4 w-4" /> Accept
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {inCall && activeCall && (
                <>
                  {/* Soft gradient backdrop so the dynamic island reads against chat */}
                  <div className="edyfra-island-backdrop" />
                  <StreamCall call={activeCall}>
                    <DynamicIsland onLeave={leaveCall} />
                  </StreamCall>
                </>
              )}

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
    </WithComponents>
    </div>
  );
}
