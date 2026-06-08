"use client";

import {
  Minimize2,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClickOutside, useEscapeToClose } from "../hooks/useIslandGestures";
import { useRef } from "react";
import { useRegisterOverlay } from "@/lib/overlay-manager";
import { Z } from "@/lib/layers";
import { IslandEndCallButton } from "./IslandEndCallButton";
import { IslandIconButton } from "./IslandIconButton";
import { IslandQualityChip } from "./IslandQualityChip";
import { IslandTimer } from "./IslandTimer";
import { IslandStage } from "./IslandStage";
import { formatElapsed } from "../hooks/useCallElapsed";
import type { QualityTier } from "../hooks/useCallQuality";

interface IslandExpandedPanelProps {
  elapsed: number;
  quality: QualityTier;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  local: any;
  remotesCount: number;
  isMuted: boolean;
  isCamOff: boolean;
  onMinimize: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  onOpenParticipants: () => void;
  onOpenSettings: () => void;
  className?: string;
}

export function IslandExpandedPanel({
  elapsed,
  quality,
  local,
  remotesCount,
  isMuted,
  isCamOff,
  onMinimize,
  onToggleMic,
  onToggleCam,
  onLeave,
  onOpenParticipants,
  onOpenSettings,
  className,
}: IslandExpandedPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, true, onMinimize);
  useEscapeToClose(true, onMinimize);

  useRegisterOverlay(
    { id: "dynamic-island-expanded", edge: "fullscreen", slot: "dynamic-island", size: 800 },
    [],
  );

  return (
    <motion.div
      key="expanded"
      ref={panelRef}
      layoutId="edyfra-island"
      initial={{ opacity: 0.9, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "relative w-[min(96vw,1200px)] h-[min(88vh,800px)] rounded-xl overflow-hidden",
        "bg-card border border-border shadow-[0_24px_80px_rgba(0,0,0,0.65)]",
        "flex flex-col group/expanded",
        className,
      )}
      style={{ zIndex: Z.FAB }}
    >
      <div className="flex justify-between items-center p-4 sm:p-6 bg-gradient-to-b from-background/90 via-background/40 to-transparent z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Private session
            </span>
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-md h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
              Live
            </span>
            <span className="text-[10px] text-foreground/60 font-bold tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <IslandQualityChip quality={quality} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinimize}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-background/80 hover:bg-background/90 text-foreground text-[10px] font-black uppercase tracking-widest transition-colors border border-border"
          >
            <Minimize2 className="h-4 w-4" /> Minimize
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center px-4 pb-28 pt-2">
        <IslandStage local={local} remotesCount={remotesCount} />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
        <div className="bg-background/80 backdrop-blur-lg border border-border p-4 rounded-xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IslandIconButton
              onClick={onToggleMic}
              active={!isMuted}
              label={isMuted ? "Unmute" : "Mute"}
              size="md"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </IslandIconButton>
            <IslandIconButton
              onClick={onToggleCam}
              active={!isCamOff}
              label={isCamOff ? "Camera on" : "Camera off"}
              size="md"
            >
              {isCamOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </IslandIconButton>
          </div>

          <div className="flex items-center gap-2">
            <IslandEndCallButton onClick={onLeave} variant="dock" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenParticipants}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-background/80 hover:bg-background/90 text-foreground transition-all"
              title="Participants"
              aria-label="Participants"
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-background/80 hover:bg-background/90 text-foreground transition-all"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
