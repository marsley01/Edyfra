"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PHRASES = [
  "Getting your study room ready...",
  "Loading your messages...",
  "Almost there..."
];

interface ChatLoadingStateProps {
  error?: string | null;
  onRetry?: () => void;
}

export function ChatLoadingState({ error, onRetry }: ChatLoadingStateProps) {
  const [index, setIndex] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, 1500);
    return () => clearInterval(phraseInterval);
  }, []);

  useEffect(() => {
    if (error) {
      setShowTimeout(true);
    }
  }, [error]);

  useEffect(() => {
    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
    }, 8000);
    return () => clearTimeout(timeoutTimer);
  }, []);

  if (showTimeout) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 px-6 text-center absolute inset-0 z-50 bg-[#FAFAF7]">
        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Having trouble connecting. Check your internet and try again.
        </p>
        {onRetry && (
          <button
            onClick={() => {
              setShowTimeout(false);
              setIndex(0);
              onRetry();
            }}
            className="px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-5 absolute inset-0 z-50 bg-[#FAFAF7]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />

      {/* M Logo Mark — 48px circle with --primary background */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary select-none" style={{ boxShadow: "0 2px 8px rgba(45, 31, 232, 0.25)" }}>
        <span className="text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-dm-sans)" }}>
          M
        </span>
      </div>

      {/* Rotating phrase — single line, fade transition */}
      <div className="h-5 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-sm font-medium text-muted-foreground whitespace-nowrap"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {PHRASES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Slim Progress Bar — 4px height, --primary, shimmer 2s loop */}
      <div className="w-56 h-1 rounded-full bg-primary/15 overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full w-1/3"
          style={{
            animationName: "shimmer",
            animationDuration: "2s",
            animationIterationCount: "infinite",
            animationTimingFunction: "linear",
          }}
        />
      </div>
    </div>
  );
}
