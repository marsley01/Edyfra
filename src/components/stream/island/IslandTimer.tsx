"use client";

import { formatElapsed } from "../hooks/useCallElapsed";

interface IslandTimerProps {
  isJoined: boolean;
  elapsed: number;
}

export function IslandTimer({ isJoined, elapsed }: IslandTimerProps) {
  return (
    <span className="text-[11px] font-bold tabular-nums text-foreground/90 tracking-tight">
      {isJoined ? formatElapsed(elapsed) : "00:00"}
    </span>
  );
}
