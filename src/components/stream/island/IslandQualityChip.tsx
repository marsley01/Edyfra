"use client";

import { Signal, Wifi, WifiLow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityTier } from "../hooks/useCallQuality";

export function IslandQualityChip({ quality }: { quality: QualityTier }) {
  return (
    <span
      className={cn(
        "hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
        quality === "good" && "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        quality === "ok" && "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
        quality === "bad" && "bg-red-500/15 text-red-300 border border-red-500/30",
      )}
    >
      {quality === "good" ? (
        <Signal className="h-2.5 w-2.5" />
      ) : quality === "ok" ? (
        <WifiLow className="h-2.5 w-2.5" />
      ) : (
        <Wifi className="h-2.5 w-2.5" />
      )}
      {quality === "good" ? "HD" : quality === "ok" ? "SD" : "Low"}
    </span>
  );
}
