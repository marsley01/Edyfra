"use client";

import { Loader2, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallStartButtonProps {
  inCall: boolean;
  starting: boolean;
  hasActiveCall: boolean;
  permDenied: boolean;
  onStart: () => void;
}

/**
 * The "Start Call" / "Join Live Call" / "In Call" pill in the chat header.
 *
 * Visual states:
 *   • Starting      — spinner, disabled
 *   • In Call       — green pill with glow
 *   • Has Active    — green outline, pulsing (someone else started the call)
 *   • Perm Denied   — red outline, click to retry
 *   • Default       — secondary, hovers to primary
 */
export function CallStartButton({
  inCall,
  starting,
  hasActiveCall,
  permDenied,
  onStart,
}: CallStartButtonProps) {
  const variant = inCall || hasActiveCall ? "default" : "outline";
  const label = inCall
    ? "In Call"
    : starting
      ? "Getting ready…"
      : hasActiveCall
        ? "Join Live Call"
        : permDenied
          ? "Needs camera/mic"
          : "Start Call";

  return (
    <Button
      onClick={onStart}
      disabled={starting}
      variant={variant}
      size="sm"
      className={cn(
        "rounded-xl transition-all h-10 px-5 gap-2 font-black text-[10px] uppercase tracking-widest",
        inCall
          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]"
          : hasActiveCall
            ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 animate-pulse"
            : permDenied
              ? "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
              : "bg-secondary hover:bg-primary hover:text-primary-foreground border-border",
      )}
    >
      {starting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : inCall ? (
        <Video className="h-4 w-4" />
      ) : permDenied ? (
        <VideoOff className="h-4 w-4" />
      ) : (
        <Video className="h-4 w-4" />
      )}
      <span>{label}</span>
    </Button>
  );
}
