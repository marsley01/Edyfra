"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR_SEEN_EVENT, TOUR_START_EVENT } from "./TourGuide";

interface TourTriggerProps {
  tourId: string;
  /** The page the tour's steps live on. Clicking elsewhere navigates there first. */
  homePath?: string;
  className?: string;
}

/**
 * "Tour Guide" button for replaying the tour. It used to read localStorage once
 * on mount, so after a new user finished the tour it stayed hidden until a full
 * reload. It now listens for TourGuide's "seen" event.
 */
export default function TourTrigger({ tourId, homePath, className }: TourTriggerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [seen, setSeen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(`tour-seen-${tourId}`) === "true");
    } catch {
      setSeen(false);
    }
    const onSeen = (event: Event) => {
      const detail = (event as CustomEvent<{ tourId?: string }>).detail;
      if (!detail?.tourId || detail.tourId === tourId) setSeen(true);
    };
    window.addEventListener(TOUR_SEEN_EVENT, onSeen);
    return () => window.removeEventListener(TOUR_SEEN_EVENT, onSeen);
  }, [tourId]);

  // Appear a moment after the tour is done, not on top of its exit animation.
  useEffect(() => {
    if (!seen) return;
    const timer = setTimeout(() => setIsVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [seen]);

  const handleRestart = () => {
    setIsVisible(false);
    setSeen(false);
    window.dispatchEvent(new CustomEvent(TOUR_START_EVENT, { detail: { tourId } }));
    if (homePath && pathname !== homePath) router.push(homePath);
  };

  return (
    <AnimatePresence>
      {isVisible && seen && (
        <motion.button
          key="tour-trigger"
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
            "text-xs font-black uppercase tracking-widest transition-shadow",
            className
          )}
          aria-label="Replay the tour"
        >
          <Compass className="h-4 w-4" />
          <span className="hidden sm:inline">Tour Guide</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
