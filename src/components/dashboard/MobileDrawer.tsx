"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Slide-in navigation drawer shared by the student and tutor mobile navs.
 *
 * The old drawers stuttered on phones for three reasons, all fixed here:
 * - They mounted on every open, so the sidebar inside re-ran its data fetch and
 *   re-rendered halfway through the slide. This stays mounted and only moves.
 * - The full-screen overlay used `backdrop-blur`, and the panel carried two
 *   120px blur "glows". Blurs are re-rasterised every frame while something
 *   moves, which is what dropped frames on mid-range Android devices. The
 *   overlay is now a plain translucent colour and the panel has no filters.
 * - Only `transform` and `opacity` animate, so the slide stays on the GPU.
 */
export function MobileDrawer({
  open,
  onClose,
  label,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Which edge the panel slides from. Right by default, under the menu button. */
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  const offscreen = side === "right" ? "100%" : "-100%";
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "tween" as const, ease: [0.32, 0.72, 0, 1] as const, duration: open ? 0.32 : 0.24 };

  // Lock page scroll while open. Restores whatever value was there before
  // instead of forcing "unset", which used to clobber other scroll locks.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes, and focus moves into the panel so keyboard and screen
  // reader users land on the menu they just opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[100] bg-black/55",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        // `inert` keeps the off-screen links out of the tab order and away from
        // screen readers while the drawer is closed.
        inert={!open}
        tabIndex={-1}
        initial={false}
        animate={{ x: open ? "0%" : offscreen }}
        transition={transition}
        className={cn(
          "fixed inset-y-0 z-[110] w-[min(320px,85vw)] bg-background shadow-2xl outline-none will-change-transform",
          side === "right" ? "right-0" : "left-0"
        )}
        style={{
          backgroundImage: `radial-gradient(120% 40% at ${side === "right" ? "100%" : "0%"} 0%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 70%)`,
        }}
      >
        <div className="h-full">{children}</div>
      </motion.div>
    </>
  );
}
