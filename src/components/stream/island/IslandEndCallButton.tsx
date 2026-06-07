"use client";

import { PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface IslandEndCallButtonProps {
  onClick: () => void;
  variant?: "icon" | "pill" | "dock";
  label?: string;
}

export function IslandEndCallButton({
  onClick,
  variant = "icon",
  label = "End call",
}: IslandEndCallButtonProps) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ml-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-[0_0_10px_rgba(239,68,68,0.5)]"
        aria-label={label}
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ml-1 inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest"
      >
        <PhoneOff className="h-4 w-4" /> End
      </button>
    );
  }

  // dock (expanded panel)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white",
        "text-[11px] font-black uppercase tracking-widest transition-all",
        "shadow-lg shadow-red-500/25 flex items-center gap-2",
      )}
    >
      <PhoneOff className="h-4 w-4" /> End Call
    </button>
  );
}
