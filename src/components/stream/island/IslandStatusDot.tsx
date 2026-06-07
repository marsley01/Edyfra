"use client";

import { Circle, Loader2 } from "lucide-react";

interface IslandStatusDotProps {
  isJoined: boolean;
  isJoining: boolean;
}

export function IslandStatusDot({ isJoined, isJoining }: IslandStatusDotProps) {
  if (isJoining) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />;
  }
  if (isJoined) {
    return (
      <>
        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
      </>
    );
  }
  return <Circle className="h-2 w-2 text-zinc-500" />;
}
