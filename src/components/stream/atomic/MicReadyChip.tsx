"use client";

import { CheckCircle2 } from "lucide-react";

export function MicReadyChip() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      Mic ready
    </span>
  );
}
