"use client";

import { GraduationCap, Sparkles } from "lucide-react";
import { CallStartButton } from "./CallStartButton";
import { MicReadyChip } from "./MicReadyChip";

interface ChatHeaderProps {
  channelName: string;
  memberCount: number;
  inCall: boolean;
  starting: boolean;
  hasActiveCall: boolean;
  permDenied: boolean;
  permWarmed: boolean;
  onStartCall: () => void;
}

export function ChatHeader({
  channelName,
  memberCount,
  inCall,
  starting,
  hasActiveCall,
  permDenied,
  permWarmed,
  onStartCall,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-background/50 backdrop-blur-xl border-b border-white/5 z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
            {channelName || "Study Room"}
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
            {memberCount === 0 ? "Just you" : `${memberCount + 2} Members`}
            <span className="ml-2 text-emerald-500">
              · <Sparkles className="inline h-3 w-3 -mt-0.5" /> Mash AI
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {permWarmed && !permDenied && !inCall && <MicReadyChip />}
        <CallStartButton
          inCall={inCall}
          starting={starting}
          hasActiveCall={hasActiveCall}
          permDenied={permDenied}
          onStart={onStartCall}
        />
      </div>
    </div>
  );
}
