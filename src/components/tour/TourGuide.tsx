"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

interface TourGuideProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  className?: string;
}

export default function TourGuide({ tourId, steps, onComplete, className }: TourGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  // Load tour state from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(`tour-seen-${tourId}`);
      setHasSeenTour(seen === "true");
    } catch {
      setHasSeenTour(false);
    }
  }, [tourId]);

  // Auto-start tour if not seen
  useEffect(() => {
    if (hasSeenTour === false) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  // Find target element and calculate position
  const updateTargetPosition = useCallback(() => {
    const selector = steps[currentStep]?.target;
    if (!selector) return;

    const target = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
    if (!target) return;

    targetRef.current = target;
    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    // Scroll target into view smoothly
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // Highlight style
    setHighlightStyle({
      position: "fixed",
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
      borderRadius: "12px",
      pointerEvents: "none",
      zIndex: 9998,
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    });
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isOpen) return;
    updateTargetPosition();
    const handleResize = () => updateTargetPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    markAsSeen();
  };

  const handleComplete = () => {
    setIsOpen(false);
    markAsSeen();
    onComplete?.();
  };

  const markAsSeen = () => {
    try {
      localStorage.setItem(`tour-seen-${tourId}`, "true");
      setHasSeenTour(true);
    } catch {
      // localStorage not available
    }
  };

  const resetTour = () => {
    try {
      localStorage.removeItem(`tour-seen-${tourId}`);
    } catch {
      // ignore
    }
    setHasSeenTour(false);
    setCurrentStep(0);
    setIsOpen(true);
  };

  // Expose reset function globally for the trigger button
  useEffect(() => {
    (window as any).__resetTour = resetTour;
    return () => {
      delete (window as any).__resetTour;
    };
  }, []);

  const currentStepData = steps[currentStep];
  if (!currentStepData || !targetRect || !mounted) return null;

  // Calculate popover position
  const popoverWidth = 320;
  const popoverHeight = 200;
  const gap = 16;

  let top = 0;
  let left = 0;
  const placement = currentStepData.placement || "auto";

  if (placement === "top" || (placement === "auto" && targetRect.top > popoverHeight + gap)) {
    top = targetRect.top - popoverHeight - gap;
    left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
  } else if (placement === "bottom" || placement === "auto") {
    top = targetRect.bottom + gap;
    left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
  } else if (placement === "left") {
    top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
    left = targetRect.left - popoverWidth - gap;
  } else if (placement === "right") {
    top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
    left = targetRect.right + gap;
  }

  // Keep popover in viewport
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  if (left < 16) left = 16;
  if (left + popoverWidth > viewportWidth - 16) left = viewportWidth - popoverWidth - 16;
  if (top < 16) top = targetRect.bottom + gap;
  if (top + popoverHeight > viewportHeight - 16) top = targetRect.top - popoverHeight - gap;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Highlight overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={highlightStyle}
            className="rounded-xl"
          />

          {/* Popover */}
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ position: "fixed", top, left, width: popoverWidth, zIndex: 9999 }}
            className={cn("bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border overflow-hidden", className)}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <h3 className="text-base font-black tracking-tight text-foreground">{currentStepData.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentStepData.description}</p>
            </div>

            {/* Progress dots */}
            <div className="px-5 pb-2 flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === currentStep
                      ? "w-6 bg-primary"
                      : idx < currentStep
                        ? "w-2 bg-primary/40"
                        : "w-2 bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 pt-2 flex items-center justify-between gap-3">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                  currentStep === 0
                    ? "opacity-0 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg"
              >
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
