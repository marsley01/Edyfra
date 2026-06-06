"use client";

import { GraduationCap } from "lucide-react";

export function ChatLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 bg-background absolute inset-0 z-50">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin [animation-duration:3s]" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full m-2 backdrop-blur-sm">
          <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      <div className="space-y-3 text-center z-10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground animate-pulse">
          Opening your study space...
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
            Keeping things private...
          </p>
        </div>
      </div>
    </div>
  );
}
