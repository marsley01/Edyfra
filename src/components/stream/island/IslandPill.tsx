"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLongPress } from "../hooks/useIslandGestures";
import { useRegisterOverlay } from "@/lib/overlay-manager";
import { Z } from "@/lib/layers";
import { IslandStatusDot } from "./IslandStatusDot";
import { IslandTimer } from "./IslandTimer";
import { IslandQualityChip } from "./IslandQualityChip";
import { IslandRecordingChip } from "./IslandRecordingChip";
import { IslandQuickControls } from "./IslandQuickControls";
import { IslandEndCallButton } from "./IslandEndCallButton";
import type { QualityTier } from "../hooks/useCallQuality";

interface IslandPillProps {
  isJoined: boolean;
  isJoining: boolean;
  elapsed: number;
  participants: number;
  quality: QualityTier;
  isRecording: boolean;
  isMuted: boolean;
  isCamOff: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  onLongPress: () => void;
  onPillClick: () => void;
  className?: string;
}

export function IslandPill({
  isJoined,
  isJoining,
  elapsed,
  participants,
  quality,
  isRecording,
  isMuted,
  isCamOff,
  onToggleMic,
  onToggleCam,
  onLeave,
  onLongPress,
  onPillClick,
  className,
}: IslandPillProps) {
  const { handlers, didLongPressRef } = useLongPress({ onLongPress });

  useRegisterOverlay(
    { id: "dynamic-island-pill", edge: "top", slot: "dynamic-island", size: 44 + 12 },
    [],
  );

  return (
    <motion.button
      key="compact"
      data-edyfra-island-pill
      layoutId="edyfra-island"
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerLeave}
      onPointerCancel={handlers.onPointerCancel}
      onClick={() => {
        if (didLongPressRef.current) {
          didLongPressRef.current = false;
          return;
        }
        onPillClick();
      }}
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      whileHover={isJoined ? { scale: 1.02 } : undefined}
      whileTap={isJoined ? { scale: 0.97 } : undefined}
      className={cn(
        "group relative flex items-center gap-2 sm:gap-3 h-11 px-3 sm:px-4",
        "rounded-[22px] bg-black/95 backdrop-blur-2xl",
        "border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "text-white select-none touch-none",
        isJoined ? "cursor-pointer" : "cursor-default opacity-95",
        className,
      )}
      aria-label={isJoined ? "Call controls" : "Call status"}
      style={{ zIndex: Z.FLOATING }}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <IslandStatusDot isJoined={isJoined} isJoining={isJoining} />
      </span>

      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
        {isJoined ? "Live" : isJoining ? "Connecting" : "Idle"}
      </span>

      <span className="h-3.5 w-px bg-white/15" />
      <IslandTimer isJoined={isJoined} elapsed={elapsed} />
      <span className="h-3.5 w-px bg-white/15" />

      <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
        <span className="tabular-nums">{participants}</span>
        <span className="hidden sm:inline">in call</span>
      </div>

      {isJoined && <IslandQualityChip quality={quality} />}
      {isRecording && <IslandRecordingChip />}

      <span className="h-3.5 w-px bg-white/15" />

      <IslandQuickControls
        isMuted={isMuted}
        isCamOff={isCamOff}
        onToggleMic={onToggleMic}
        onToggleCam={onToggleCam}
        onLeave={onLeave}
        size="sm"
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-50"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 45%)",
        }}
      />
    </motion.button>
  );
}

export { IslandEndCallButton };
