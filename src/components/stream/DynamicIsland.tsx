"use client";

import { useCallback, useState } from "react";
import { useCallStateHooks, CallingState } from "@stream-io/video-react-sdk";
import { AnimatePresence } from "framer-motion";
import { useCallElapsed } from "./hooks/useCallElapsed";
import { useCallQuality } from "./hooks/useCallQuality";
import { IslandPill } from "./island/IslandPill";
import { IslandExpandedPanel } from "./island/IslandExpandedPanel";
import { LongPressActions } from "./island/LongPressActions";
import { ThinkingMessage } from "./island/ThinkingMessage";

type IslandMode = "compact" | "expanded";

export interface DynamicIslandProps {
  onLeave: () => void;
  remoteName?: string;
  remoteImage?: string;
  className?: string;
  thinkingMessage?: string | null;
  onDismissThinking?: () => void;
  /**
   * Fires when the user taps the compact pill. Use this to restore a
   * minimised fullscreen call (the parent owns the minimised/maximised
   * state). Internal compact/expanded toggling of the island's own panel
   * is still handled by the island.
   */
  onPillClick?: () => void;
}

/**
 * The Dynamic Island — modeled after the iPhone's Dynamic Island.
 *
 * States (modeled after iOS Live Activities):
 *   1. HIDDEN        — no call, no activity. Not rendered.
 *   2. THINKING      — Mash AI "thinking" bubble (no active call yet).
 *   3. COMPACT       — small pill while joining/joined. The "iOS compact" mode.
 *   4. EXPANDED      — tap/long-press the pill to expand to a full panel.
 *
 * Interactions (matching iOS):
 *   • TAP the pill          → toggle between COMPACT and EXPANDED.
 *   • LONG-PRESS the pill   → quick-action overlay (mute / camera / leave / etc).
 *   • TAP outside the panel → collapse back to COMPACT.
 *   • Escape                → collapse back to COMPACT.
 *
 * Smooth morphing between states is achieved with framer-motion's shared
 * `layoutId` so the pill and the panel feel like a single fluid surface.
 *
 * This component is now a THIN orchestrator. All state derivation lives in
 * hooks; all sub-pieces live in /island/*. Edit a chip without touching
 * the call logic, edit the call logic without touching the chip.
 */
export function DynamicIsland({
  onLeave,
  remoteName: _remoteName,
  remoteImage: _remoteImage,
  className,
  thinkingMessage,
  onDismissThinking,
  onPillClick,
}: DynamicIslandProps) {
  const [mode, setMode] = useState<IslandMode>("compact");
  const [longPressOpen, setLongPressOpen] = useState(false);

  const {
    useCallCallingState,
    useLocalParticipant,
    useRemoteParticipants,
    useMicrophoneState,
    useCameraState,
    useSpeakerState,
    useIsCallRecordingInProgress,
    useCallStatsReport,
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const local = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const mic = useMicrophoneState();
  const cam = useCameraState();
  const speaker = useSpeakerState();
  const isRecording = useIsCallRecordingInProgress();
  const stats = useCallStatsReport();

  const elapsed = useCallElapsed(callingState);
  const quality = useCallQuality(stats);

  const isJoined = callingState === CallingState.JOINED;
  const isJoining =
    callingState === CallingState.JOINING || callingState === CallingState.RINGING;
  const participants = remotes.length + 1;
  const isMuted = mic.isMute;
  const isCamOff = cam.isMute;

  const toggleMic = useCallback(() => {
    try {
      mic.microphone.toggle();
    } catch {
      /* noop — device may be unplugged */
    }
  }, [mic.microphone]);

  const toggleCam = useCallback(() => {
    try {
      cam.camera.toggle();
    } catch {
      /* noop */
    }
  }, [cam.camera]);

  const handlePillClick = useCallback(() => {
    onPillClick?.();
    if (isJoined) setMode((m) => (m === "compact" ? "expanded" : "compact"));
  }, [isJoined, onPillClick]);

  // Mash AI thinking bubble takes priority over the call pill when not on a call.
  if (thinkingMessage && !isJoined && !isJoining) {
    return <ThinkingMessage message={thinkingMessage} onDismiss={onDismissThinking} />;
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "expanded" ? (
            <IslandExpandedPanel
              elapsed={elapsed}
              quality={quality}
              local={local}
              remotesCount={remotes.length}
              isMuted={isMuted}
              isCamOff={isCamOff}
              onMinimize={() => setMode("compact")}
              onToggleMic={toggleMic}
              onToggleCam={toggleCam}
              onLeave={onLeave}
              onOpenParticipants={() => {
                /* wired to a future participants panel */
              }}
              onOpenSettings={() => {
                /* wired to a future settings panel */
              }}
              className={className}
            />
          ) : (
            <IslandPill
              isJoined={isJoined}
              isJoining={isJoining}
              elapsed={elapsed}
              participants={participants}
              quality={quality}
              isRecording={isRecording}
              isMuted={isMuted}
              isCamOff={isCamOff}
              onToggleMic={toggleMic}
              onToggleCam={toggleCam}
              onLeave={onLeave}
              onLongPress={() => setLongPressOpen(true)}
              onPillClick={handlePillClick}
              className={className}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {longPressOpen && (
          <LongPressActions
            isMuted={isMuted}
            isCamOff={isCamOff}
            speakerSelected={!!speaker.selectedDevice}
            onToggleMic={() => {
              toggleMic();
              setLongPressOpen(false);
            }}
            onToggleCam={() => {
              toggleCam();
              setLongPressOpen(false);
            }}
            onSelectSpeaker={() => {
              try {
                speaker.speaker.select(speaker.selectedDevice || "default");
              } catch {
                /* noop */
              }
              setLongPressOpen(false);
            }}
            onShare={() => setLongPressOpen(false)}
            onRaiseHand={() => setLongPressOpen(false)}
            onLeave={() => {
              onLeave();
              setLongPressOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
