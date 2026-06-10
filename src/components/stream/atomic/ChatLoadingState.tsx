"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

const STEPS = [
  "Authenticating...",
  "Connecting to chat...",
  "Loading messages...",
  "Preparing study space..."
];

export function ChatLoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 bg-background absolute inset-0 z-50">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin [animation-duration:3s]" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg m-2 backdrop-blur-sm">
          <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      <div className="space-y-3 text-center z-10">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-foreground transition-all">
          {STEPS[step]}
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-md bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
            Keeping things private...
          </p>
        </div>
      </div>
    </div>
  );
}
