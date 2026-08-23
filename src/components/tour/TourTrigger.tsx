"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourTriggerProps {
  tourId: string;
  className?: string;
}

export default function TourTrigger({ tourId, className }: TourTriggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(`tour-seen-${tourId}`);
      setHasSeen(seen === "true");
    } catch {
      setHasSeen(true);
    }
  }, [tourId]);

  // Show trigger after a delay if tour has been seen
  useEffect(() => {
    if (hasSeen === true) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasSeen]);

  const handleRestart = () => {
    try {
      localStorage.removeItem(`tour-seen-${tourId}`);
    } catch {
      // ignore
    }
    // Trigger tour restart
    if ((window as any).__resetTour) {
      (window as any).__resetTour();
    }
    setIsVisible(false);
  };

  if (!mounted || hasSeen === false) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRestart}
          className={cn(
            // Sits left of the AI bot orb, above the mobile bottom nav
            // (nav ≈ 64px + safe-area) so neither the tutors nor alerts tabs are covered.
            "fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-[5.25rem] lg:bottom-6 lg:right-24 z-40",
            "flex items-center gap-2 px-4 py-3 rounded-full",
            "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:shadow-primary/50",
            "text-xs font-black uppercase tracking-widest transition-all",
            className
          )}
          aria-label="Restart tour guide"
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden sm:inline">Tour Guide</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
