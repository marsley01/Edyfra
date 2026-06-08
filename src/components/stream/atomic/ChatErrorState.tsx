"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatErrorState({
  error,
  isRetrying,
  onRetry,
}: {
  error: string;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <p className="font-black text-sm uppercase tracking-widest text-foreground">
          Chat failed to load
        </p>
        <p className="text-xs text-muted-foreground font-medium max-w-xs">{error}.</p>
      </div>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        className="h-12 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs tracking-widest uppercase"
      >
        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry Connection"}
      </Button>
    </div>
  );
}
