"use client";

import { Mic, MicOff, Camera, CameraOff, Hand, ScreenShare, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { IslandIconButton } from "./IslandIconButton";
import { IslandEndCallButton } from "./IslandEndCallButton";

interface LongPressActionsProps {
  isMuted: boolean;
  isCamOff: boolean;
  speakerSelected: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSelectSpeaker: () => void;
  onShare: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
}

export function LongPressActions({
  isMuted,
  isCamOff,
  speakerSelected,
  onToggleMic,
  onToggleCam,
  onSelectSpeaker,
  onShare,
  onRaiseHand,
  onLeave,
}: LongPressActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="pointer-events-auto absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-1.5 px-2 py-2 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
    >
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
      <IslandIconButton onClick={onRaiseHand} active={true} label="Raise hand" size="md">
        <Hand className="h-4 w-4" />
      </IslandIconButton>
      <IslandIconButton
        onClick={onSelectSpeaker}
        active={true}
        label={speakerSelected ? "Speaker" : "Audio"}
        size="md"
      >
        {speakerSelected ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </IslandIconButton>
      <IslandIconButton onClick={onShare} active={true} label="Share" size="md">
        <ScreenShare className="h-4 w-4" />
      </IslandIconButton>
      <IslandEndCallButton onClick={onLeave} variant="pill" />
    </motion.div>
  );
}
