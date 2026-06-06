"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Call, StreamVideoClient } from "@stream-io/video-react-sdk";
import { showError, showInfo } from "@/lib/toast";
import type { CallState } from "../types";
import { CALL_SETTINGS, HIGH_QUALITY_OVERRIDE } from "../styles/callSettings";
import { useMediaPermissions } from "./useMediaPermissions";

interface UseCallSessionParams {
  channelId: string;
  userId: string;
  memberIds?: string[];
  videoClient: StreamVideoClient | null;
  setActiveCall: (call: Call | null) => void;
  onRequestPermissions: () => Promise<boolean>;
}

interface UseCallSessionReturn {
  callState: CallState;
  hasActiveCall: boolean;
  activeCall: Call | null;
  startOrJoinCall: () => Promise<void>;
  leaveCall: () => Promise<void>;
}

/**
 * Call lifecycle state machine.
 *
 * State transitions:
 *   idle ──start──▶ starting ──permOK──▶ joining ──joinOK──▶ joined
 *     ▲                                                  │
 *     └────────────────── leaveCall ─────────────────────┘
 *
 *   any ──error──▶ error (toast surfaces it)
 *
 * This hook owns:
 *   • The CallState value (idle/starting/joining/joined/ended/error).
 *   • A ref mirror of activeCall (refs survive stale closures, vital for
 *     cleanup handlers in global event listeners).
 *   • The "all" subscription on the global video client for call.created /
 *     call.ended / call.rejected events scoped to channelId.
 *   • startOrJoinCall: getOrCreate with 1080p settings, then join.
 *   • leaveCall: graceful leave + local state reset.
 *
 * Why a hook: the call logic is referenced by both the chat room AND the
 * StreamVideoProvider's global ringing UI. Once we lift this into a hook,
 * the global ringing path can call the same `startOrJoinCall` and stay in sync.
 */
export function useCallSession({
  channelId,
  userId,
  memberIds,
  videoClient,
  setActiveCall,
  onRequestPermissions,
}: UseCallSessionParams): UseCallSessionReturn {
  const [callState, setCallState] = useState<CallState>("idle");
  const [hasActiveCall, setHasActiveCall] = useState(false);

  const activeCallRef = useRef<Call | null>(null);
  const [activeCall, setActiveCallState] = useState<Call | null>(null);

  // Keep the ref in sync so cleanup / global event handlers never see a stale value
  const setCall = useCallback(
    (call: Call | null) => {
      activeCallRef.current = call;
      setActiveCallState(call);
      setActiveCall(call);
    },
    [setActiveCall],
  );

  // ─── Listen for global call events on the video client ───────────────────
  useEffect(() => {
    if (!videoClient) return;

    const unsubscribe = videoClient.on("all", (event: any) => {
      if (event.call?.id !== channelId) return;

      switch (event.type) {
        case "call.created":
        case "call.session_started": {
          setHasActiveCall(true);
          break;
        }
        case "call.ended": {
          setHasActiveCall(false);
          setCallState("ended");
          setCall(null);
          break;
        }
        case "call.rejected": {
          setHasActiveCall(false);
          setCallState("idle");
          showInfo("Call was declined", { description: "The other person didn't accept this time." });
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [videoClient, channelId, setCall]);

  // ─── Start a call (or join an existing one) ──────────────────────────────
  const startOrJoinCall = useCallback(async () => {
    if (!videoClient) {
      showError({
        title: "Video service not ready",
        cause: "We haven't finished loading the call tool.",
        fix: "Refresh the page and try again.",
      });
      return;
    }

    if (activeCallRef.current) {
      setCallState("joined");
      return;
    }

    setCallState("starting");

    const ok = await onRequestPermissions();
    if (!ok) {
      setCallState("error");
      return;
    }

    try {
      const call = videoClient.call("default", channelId);

      const otherMembers = (memberIds || [])
        .filter((m) => m && m !== userId)
        .map((id) => ({ user_id: id }));

      await call.getOrCreate({
        ring: true,
        data: {
          members: [{ user_id: userId, role: "admin" }, ...otherMembers],
          custom: { startedBy: userId },
        },
      });

      // High-quality preferences: 1080p, adaptive bitrate, noise suppression.
      try {
        await call.update(HIGH_QUALITY_OVERRIDE);
      } catch (err) {
        console.warn("[useCallSession] settings_override failed (non-fatal):", err);
      }

      setCall(call);
      setHasActiveCall(true);
      setCallState("joining");

      await call.join();
      setCallState("joined");
      console.log(`[useCallSession] Joined call: ${channelId}`);
    } catch (err) {
      console.error("[useCallSession] startOrJoinCall failed:", err);
      setCallState("error");
      setCall(null);
      const message = err instanceof Error ? err.message : "Check your connection and try again.";
      showError({
        title: "Couldn't start the call",
        cause: "The call couldn't connect.",
        fix: "Check your camera/mic and try again.",
        raw: message,
      });
    }
  }, [channelId, userId, memberIds, videoClient, onRequestPermissions, setCall]);

  // ─── Leave the call ─────────────────────────────────────────────────────
  const leaveCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (call) {
      try {
        await call.leave();
      } catch (err) {
        console.warn("[useCallSession] leave failed:", err);
      }
    }
    setCall(null);
    setCallState("idle");
    setHasActiveCall(false);
  }, [setCall]);

  return {
    callState,
    hasActiveCall,
    activeCall,
    startOrJoinCall,
    leaveCall,
  };
}

// Re-export the settings constant so consumers can read it without a second import.
export { CALL_SETTINGS };
// Re-export permission hook for ergonomics.
export { useMediaPermissions };
