"use client";

import { Bot, X as XIcon } from "lucide-react";
import { motion } from "framer-motion";

export function ThinkingMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <motion.div
        layoutId="edyfra-island"
        initial={{ y: -40, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -40, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] text-foreground"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
          <Bot className="h-3.5 w-3.5 text-cyan-300" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-md bg-cyan-400 animate-pulse" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Mash
          </span>
          <span className="text-[10px] text-foreground/70 font-medium max-w-[200px] truncate">
            {message === "Thinking..." ? "Mash is brainstorming..." : message}
          </span>
        </div>
        <span className="flex gap-0.5 ml-1">
          <span className="h-1.5 w-1.5 rounded-md bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-md bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-md bg-foreground/40 animate-bounce" />
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-1 h-6 w-6 inline-flex items-center justify-center rounded-lg bg-background/80 hover:bg-background/90 text-foreground/80"
            aria-label="Dismiss"
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
