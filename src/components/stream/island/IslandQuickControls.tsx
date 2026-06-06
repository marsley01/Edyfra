"use client";

import { Mic, MicOff, Camera, CameraOff } from "lucide-react";
import { IslandIconButton } from "./IslandIconButton";
import { IslandEndCallButton } from "./IslandEndCallButton";

interface IslandQuickControlsProps {
  isMuted: boolean;
  isCamOff: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  size?: "sm" | "md";
}

/**
 * The mic / cam / hangup pill. Stops click propagation so clicking
 * controls doesn't toggle the pill's expand/collapse.
 */
export function IslandQuickControls({
  isMuted,
  isCamOff,
  onToggleMic,
  onToggleCam,
  onLeave,
  size = "sm",
}: IslandQuickControlsProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <IslandIconButton
        onClick={onToggleMic}
        active={!isMuted}
        label={isMuted ? "Unmute" : "Mute"}
        size={size}
      >
        {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </IslandIconButton>
      <IslandIconButton
        onClick={onToggleCam}
        active={!isCamOff}
        label={isCamOff ? "Camera on" : "Camera off"}
        size={size}
      >
        {isCamOff ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
      </IslandIconButton>
      {size === "sm" ? (
        <IslandEndCallButton onClick={onLeave} variant="icon" />
      ) : (
        <></>
      )}
    </div>
  );
}

export { IslandEndCallButton };
