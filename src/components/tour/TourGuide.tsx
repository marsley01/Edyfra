"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** `data-tour` value of the element to highlight. */
  target: string;
  /**
   * Used instead of `target` below the `lg` breakpoint, where the desktop
   * sidebar is hidden. Steps whose target is not visible are skipped.
   */
  mobileTarget?: string;
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

/** Fired by TourTrigger (or anything else) to replay a tour. */
export const TOUR_START_EVENT = "edyfra:tour-start";
/** Fired when a tour is finished or skipped, so TourTrigger can appear. */
export const TOUR_SEEN_EVENT = "edyfra:tour-seen";

const storageKey = (tourId: string) => `tour-seen-${tourId}`;
const SPOTLIGHT_PADDING = 6;
const GAP = 14;
const EDGE = 12;
const MOBILE_SHEET_MAX = 640;
const LG_BREAKPOINT = 1024;

type Rect = { top: number; left: number; width: number; height: number };

function readSeen(tourId: string): boolean {
  try {
    return localStorage.getItem(storageKey(tourId)) === "true";
  } catch {
    // Storage blocked (private mode): treat as seen so the tour cannot
    // auto-open on every single page load.
    return true;
  }
}

function writeSeen(tourId: string, seen: boolean) {
  try {
    if (seen) localStorage.setItem(storageKey(tourId), "true");
    else localStorage.removeItem(storageKey(tourId));
  } catch {
    // ignore
  }
}

/** The first visible element for a step, honouring `mobileTarget`. */
function findTarget(step: TourStep | undefined): HTMLElement | null {
  if (!step || typeof window === "undefined") return null;
  const isNarrow = window.innerWidth < LG_BREAKPOINT;
  const name = isNarrow && step.mobileTarget ? step.mobileTarget : step.target;
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

function sameRect(a: Rect | null, b: Rect): boolean {
  return (
    !!a &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/**
 * Spotlight tour for first-time visitors.
 *
 * What the previous version got wrong, and what this one does instead:
 * - It looked for the first target once, 800ms after mount. The dashboard is
 *   still showing skeletons at that point, so the tour stayed invisible
 *   forever (open, but with nothing to point at) and new users never saw it.
 *   Now it waits until the first target is actually on screen.
 * - A step whose element was missing (the desktop sidebar on a phone) kept the
 *   previous step's highlight. Missing steps are now skipped, and steps can
 *   name a `mobileTarget`.
 * - It called scrollIntoView from its own scroll listener, so every scroll
 *   triggered another smooth scroll and the page fought the user. It now
 *   scrolls once per step and follows the target with requestAnimationFrame.
 * - The popover position assumed a fixed 200px height. It is now measured, and
 *   on phones the popover is a sheet docked away from the highlighted element.
 */
export default function TourGuide({ tourId, steps, onComplete, className }: TourGuideProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [popoverHeight, setPopoverHeight] = useState(220);
  const [gliding, setGliding] = useState(false);
  // Bumped when a replay is requested on a page without the tour's elements,
  // which re-arms the auto-start poll below so the tour begins once they exist.
  const [armed, setArmed] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const finish = useCallback(
    (completed: boolean) => {
      setIsOpen(false);
      setRect(null);
      targetRef.current = null;
      writeSeen(tourId, true);
      window.dispatchEvent(new CustomEvent(TOUR_SEEN_EVENT, { detail: { tourId } }));
      if (completed) onComplete?.();
    },
    [tourId, onComplete],
  );

  /** Moves to the nearest step at or after `from` (in `direction`) that has a visible target. */
  const goTo = useCallback(
    (from: number, direction: 1 | -1) => {
      for (let i = from; i >= 0 && i < steps.length; i += direction) {
        const el = findTarget(steps[i]);
        if (el) {
          targetRef.current = el;
          setStepIndex(i);
          setGliding(true);
          el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
          return;
        }
      }
      // Going forward with nothing left means the tour is done. Going back
      // with nothing earlier just stays where it is.
      if (direction === 1) finish(true);
    },
    [steps, reduceMotion, finish],
  );

  const start = useCallback(() => {
    setIsOpen(true);
    goTo(0, 1);
  }, [goTo]);

  // Auto-start for first-time visitors, but only once the first target exists.
  // Polling is deliberate: the dashboard renders its content in several async
  // waves, and a cheap interval is simpler and sturdier than a MutationObserver
  // on the whole document.
  useEffect(() => {
    if (!mounted || readSeen(tourId) || isOpen) return;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const poll = setInterval(() => {
      if (!findTarget(steps[0])) return;
      clearInterval(poll);
      // Let the rest of the page finish its first layout pass before the
      // spotlight appears, so it does not jump as cards load in around it.
      settleTimer = setTimeout(start, 700);
    }, 400);
    return () => {
      clearInterval(poll);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [mounted, tourId, steps, isOpen, start, armed]);

  // Replay on request from TourTrigger.
  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<{ tourId?: string }>).detail;
      if (detail?.tourId && detail.tourId !== tourId) return;
      writeSeen(tourId, false);
      if (findTarget(steps[0])) start();
      else setArmed((n) => n + 1);
    };
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, [tourId, steps, start]);

  // Follow the target every frame while open. This covers scrolling (including
  // inner scroll containers), resizes, and cards above it changing height as
  // their data arrives, with no event-listener feedback loops.
  useEffect(() => {
    if (!isOpen) return;
    let frame = 0;
    let missingFrames = 0;
    const tick = () => {
      const el = targetRef.current;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          missingFrames = 0;
          const next = { top: r.top, left: r.left, width: r.width, height: r.height };
          setRect((prev) => (sameRect(prev, next) ? prev : next));
        } else {
          missingFrames++;
        }
      } else {
        missingFrames++;
      }
      // The target vanished for about half a second (the user navigated away,
      // or the section unmounted). Close quietly without marking the tour as
      // seen, so it can start again next time the dashboard is shown.
      if (missingFrames > 30) {
        setIsOpen(false);
        setRect(null);
        return;
      }
      setViewport((prev) =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight },
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, stepIndex]);

  // Animate the spotlight between steps, but track scrolling 1:1 afterwards.
  useEffect(() => {
    if (!gliding) return;
    const t = setTimeout(() => setGliding(false), 450);
    return () => clearTimeout(t);
  }, [gliding, stepIndex]);

  // Measure the real popover height for positioning.
  useLayoutEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const h = popoverRef.current.offsetHeight;
    if (h && Math.abs(h - popoverHeight) > 1) setPopoverHeight(h);
  });

  // Keyboard: Esc skips, arrows step.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
      else if (event.key === "ArrowRight") goTo(stepIndex + 1, 1);
      else if (event.key === "ArrowLeft") goTo(stepIndex - 1, -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, stepIndex, goTo, finish]);

  if (!mounted) return null;

  const step = steps[stepIndex];
  const visibleSteps = steps.filter((s) => findTarget(s) !== null || s === step);
  const position = Math.max(0, visibleSteps.indexOf(step));
  const isLast = !steps.slice(stepIndex + 1).some((s) => findTarget(s));
  const isFirst = !steps.slice(0, stepIndex).some((s) => findTarget(s));

  const isSheet = viewport.width < MOBILE_SHEET_MAX;
  const popoverWidth = Math.min(340, viewport.width - EDGE * 2);
  const popoverStyle = rect ? computePopoverStyle(rect, step?.placement ?? "auto", popoverWidth, popoverHeight, viewport, isSheet) : {};

  const spotlight = rect && {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && step && rect && spotlight && (
        <motion.div
          key="tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Swallows clicks so the page underneath cannot be used mid-tour. */}
          <div className="fixed inset-0 z-[9997]" aria-hidden="true" />

          {/* Spotlight: a hole in a dim overlay, made with one huge box-shadow. */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[9998] rounded-2xl ring-2 ring-primary/70"
            style={{
              ...spotlight,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.62)",
              transition:
                gliding && !reduceMotion
                  ? "top 0.4s cubic-bezier(0.32,0.72,0,1), left 0.4s cubic-bezier(0.32,0.72,0,1), width 0.4s cubic-bezier(0.32,0.72,0,1), height 0.4s cubic-bezier(0.32,0.72,0,1)"
                  : "none",
            }}
          />

          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-step-title"
            aria-describedby="tour-step-body"
            className={cn(
              "fixed z-[9999] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
              className,
            )}
            style={{
              ...popoverStyle,
              transition:
                gliding && !reduceMotion
                  ? "top 0.4s cubic-bezier(0.32,0.72,0,1), left 0.4s cubic-bezier(0.32,0.72,0,1), bottom 0.4s cubic-bezier(0.32,0.72,0,1)"
                  : "none",
            }}
          >
            <div className="flex items-center justify-between border-b border-border/50 p-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                  <Compass className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Step {position + 1} of {visibleSteps.length}
                </span>
              </div>
              <button
                onClick={() => finish(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div key={stepIndex} className="space-y-2 p-5 pb-3 animate-in fade-in duration-300">
              <h3 id="tour-step-title" className="text-base font-black tracking-tight text-foreground">
                {step.title}
              </h3>
              <p id="tour-step-body" className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-5 pb-2" aria-hidden="true">
              {visibleSteps.map((s, idx) => (
                <div
                  key={s.target}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === position ? "w-6 bg-primary" : idx < position ? "w-2 bg-primary/40" : "w-2 bg-muted",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 pt-2">
              <button
                onClick={() => goTo(stepIndex - 1, -1)}
                disabled={isFirst}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
                  isFirst ? "pointer-events-none opacity-0" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={() => goTo(stepIndex + 1, 1)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95"
                autoFocus
              >
                {isLast ? "Finish" : "Next"}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function computePopoverStyle(
  rect: Rect,
  placement: NonNullable<TourStep["placement"]>,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  isSheet: boolean,
): React.CSSProperties {
  // Phones: a full-width sheet on whichever half of the screen the target is
  // not in, so the highlighted element is never hidden behind the popover.
  if (isSheet) {
    const targetCenter = rect.top + rect.height / 2;
    const base: React.CSSProperties = { left: EDGE, width: viewport.width - EDGE * 2 };
    return targetCenter > viewport.height / 2
      ? { ...base, top: `calc(env(safe-area-inset-top, 0px) + ${EDGE}px)` }
      : { ...base, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${EDGE}px)` };
  }

  const fits = {
    bottom: rect.top + rect.height + GAP + height <= viewport.height - EDGE,
    top: rect.top - GAP - height >= EDGE,
    right: rect.left + rect.width + GAP + width <= viewport.width - EDGE,
    left: rect.left - GAP - width >= EDGE,
  };
  const order: Array<keyof typeof fits> =
    placement === "auto" ? ["bottom", "top", "right", "left"] : [placement, "bottom", "top", "right", "left"];
  const side = order.find((s) => fits[s]);

  let top: number;
  let left: number;
  switch (side) {
    case "bottom":
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - width / 2;
      break;
    case "top":
      top = rect.top - GAP - height;
      left = rect.left + rect.width / 2 - width / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - height / 2;
      left = rect.left + rect.width + GAP;
      break;
    case "left":
      top = rect.top + rect.height / 2 - height / 2;
      left = rect.left - GAP - width;
      break;
    default:
      // The target fills the screen (a tall card): pin to the bottom edge.
      top = viewport.height - height - EDGE;
      left = rect.left + rect.width / 2 - width / 2;
  }

  return {
    width,
    top: Math.min(Math.max(top, EDGE), viewport.height - height - EDGE),
    left: Math.min(Math.max(left, EDGE), viewport.width - width - EDGE),
  };
}
