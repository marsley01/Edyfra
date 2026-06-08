"use client";

import { useRef, useState } from "react";
import {
  CallingState,
  StreamCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { CallTopBar } from "./CallTopBar";
import { VideoGrid } from "./VideoGrid";
import { ScreenShareLayout } from "./ScreenShareLayout";
import { ChatSidePanel } from "./ChatSidePanel";
import { ControlsBar } from "./ControlsBar";

interface ActiveCallProps {
  /** The call instance. */
  call: import("@stream-io/video-react-sdk").Call;
  /** Session label shown in the top bar (e.g. "Mathematics · Algebra"). */
  sessionLabel: string;
  /** Hang up handler — parent will reset state and unmount us. */
  onLeave: () => void;
  /** Optional "minimise" action — collapses the call to the DynamicIsland pill. */
  onMinimize?: () => void;
  /**
   * When true, the chat panel is always visible (desktop default). When
   * false, the chat becomes a toggle button in the top bar (mobile).
   */
  chatDefaultOpen?: boolean;
}

/**
 * Zoom-style full call experience. Shown when the call is joined/joining.
 *
 *   1. <StreamCall> provides the SDK hook context to every child.
 *   2. Top bar shows brand + session label + live timer + chat toggle + close.
 *   3. Body renders the video area (grid or screen-share layout) and the chat.
 *   4. Controls bar sits at the bottom with all 8 buttons.
 *   5. A joining placeholder covers the video area while the SDK connects.
 */
export function ActiveCall({
  call,
  sessionLabel,
  onLeave,
  onMinimize,
  chatDefaultOpen = true,
}: ActiveCallProps) {
  return (
    <StreamCall call={call}>
      <ActiveCallInner
        sessionLabel={sessionLabel}
        onLeave={onLeave}
        onMinimize={onMinimize}
        chatDefaultOpen={chatDefaultOpen}
      />
    </StreamCall>
  );
}

interface InnerProps {
  sessionLabel: string;
  onLeave: () => void;
  onMinimize?: () => void;
  chatDefaultOpen: boolean;
}

function ActiveCallInner({
  sessionLabel,
  onLeave,
  onMinimize,
  chatDefaultOpen,
}: InnerProps) {
  const { useCallCallingState, useScreenShareState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const { status: screenShareStatus } = useScreenShareState();

  const isSharing = screenShareStatus === "enabled";
  const isJoining = callingState === CallingState.JOINING;
  const isJoined = callingState === CallingState.JOINED;
  const showControls = isJoined || isJoining;

  // Latch the join time the first time we see JOINED so the timer is stable
  // across re-renders and tab refocuses.
  const joinedAtRef = useRef<number | null>(null);
  if (isJoined && joinedAtRef.current === null) {
    joinedAtRef.current = Date.now();
  }

  const [chatOpen, setChatOpen] = useState(chatDefaultOpen);

  return (
    <div className="active-call" data-testid="active-call">
      <CallTopBar
        sessionLabel={sessionLabel}
        hideChatToggle={chatDefaultOpen}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        onClose={onMinimize}
      />

      <div className="call-body">
        <div className="video-area">
          {isJoining ? (
            <JoiningPlaceholder />
          ) : isSharing ? (
            <ScreenShareLayout />
          ) : (
            <VideoGrid />
          )}
        </div>

        {chatOpen && <ChatSidePanel />}
      </div>

      {showControls && <ControlsBar onLeave={onLeave} />}
    </div>
  );
}

function JoiningPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center text-center text-white/80 max-w-sm mx-auto space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/30 blur-3xl rounded-xl animate-pulse" />
        <div className="w-20 h-20 rounded-xl border-2 border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center relative">
          <div className="w-3 h-3 rounded-md bg-cyan-400 animate-ping" />
        </div>
      </div>
      <p className="text-base font-black uppercase tracking-widest">Joining…</p>
      <p className="text-[11px] text-white/50 font-bold uppercase tracking-widest">
        Setting up your audio and video
      </p>
    </div>
  );
}
