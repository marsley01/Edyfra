"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The Overlay Manager — a single source of truth for "what's currently
 * floating on the screen" so components can position themselves so they
 * don't collide with each other.
 *
 * Why this exists:
 *   Edyfra has 5+ floating surfaces (Dynamic Island, Eddy Chat, Mobile Nav,
 *   Ringing UI, Sonner Toasts, Feedback button). They all hardcoded `z-50`
 *   and `bottom-6 right-6` etc. On an iPhone 15/16 the Eddy Chat button
 *   overlaps the End Call button, the Mobile Nav covers the chat input,
 *   the Ringing modal appears under the Review modal, etc.
 *
 * What it does:
 *   • Each "overlay" registers itself on mount and unregisters on unmount,
 *     passing a layout hint (which edge it occupies and how much space it
 *     needs).
 *   • The manager aggregates those hints and writes CSS variables
 *     (`--edyfra-overlay-top/bottom/right`) to `:root` so any floating
 *     component can position itself with `bottom: var(--edyfra-overlay-bottom)`.
 *   • The manager is also a single layer registry — see `LayeredPortal` in
 *     `@/components/system/LayeredPortal` for the matching z-index system.
 *
 * Usage:
 *   const { register } = useOverlayManager();
 *   useEffect(() => {
 *     const id = register({ id: "eddy-chat", edge: "bottom-right", size: 80 });
 *     return () => unregister(id);
 *   }, []);
 */

export type OverlayEdge = "top" | "bottom" | "bottom-right" | "bottom-left" | "center" | "fullscreen";

export interface OverlayDescriptor {
  id: string;
  edge: OverlayEdge;
  /** Approximate reserved size in pixels (for safe-area insets). */
  size?: number;
  /** Tag this overlay as one of the well-known slots (used by EddyChat, etc.). */
  slot?:
    | "eddy-chat"
    | "dynamic-island"
    | "mobile-nav"
    | "ringing"
    | "toast"
    | "feedback"
    | "review-modal"
    | "match-notification";
  /** Optional priority. Higher numbers win on conflict. Default 0. */
  priority?: number;
}

interface InternalOverlay extends Required<Pick<OverlayDescriptor, "id" | "edge" | "slot" | "priority">> {
  size: number;
}

interface OverlayManagerValue {
  /** Register an overlay. Returns an opaque unregister handle (the id). */
  register: (descriptor: OverlayDescriptor) => string;
  /** Unregister a previously-registered overlay. Safe to call with unknown id. */
  unregister: (id: string) => void;
  /** Check whether an overlay is currently active. */
  isActive: (slot: NonNullable<OverlayDescriptor["slot"]>) => boolean;
  /** Get the full list (read-only, useful for debugging). */
  list: () => readonly InternalOverlay[];
}

const OverlayContext = createContext<OverlayManagerValue | null>(null);

const DEFAULTS: Omit<InternalOverlay, "id"> = {
  edge: "bottom-right",
  size: 0,
  slot: "eddy-chat",
  priority: 0,
};

export function OverlayManagerProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<InternalOverlay[]>([]);
  // Use a ref mirror so register/unregister (stable callbacks) don't churn.
  const ref = useRef<InternalOverlay[]>([]);

  const writeInsets = useCallback((next: readonly InternalOverlay[]) => {
    if (typeof document === "undefined") return;

    let top = 0;
    let bottom = 0;
    let right = 0;
    let bottomEdge = 0;

    for (const o of next) {
      const size = o.size;
      if (o.edge === "top" || o.edge === "fullscreen") {
        top = Math.max(top, size);
      }
      if (o.edge === "bottom" || o.edge === "bottom-right" || o.edge === "bottom-left" || o.edge === "fullscreen") {
        bottom = Math.max(bottom, size);
      }
      if (o.edge === "bottom") {
        bottomEdge = Math.max(bottomEdge, size);
      }
      if (o.edge === "bottom-right") {
        right = Math.max(right, size);
      }
    }

    const root = document.documentElement;
    root.style.setProperty("--edyfra-overlay-top", `${top}px`);
    root.style.setProperty("--edyfra-overlay-bottom", `${bottom}px`);
    root.style.setProperty("--edyfra-overlay-bottom-edge", `${bottomEdge}px`);
    root.style.setProperty("--edyfra-overlay-right", `${right}px`);
  }, []);

  const register = useCallback(
    (descriptor: OverlayDescriptor) => {
      const id = descriptor.id;
      const next: InternalOverlay = {
        id,
        edge: descriptor.edge ?? DEFAULTS.edge,
        size: descriptor.size ?? DEFAULTS.size,
        slot: (descriptor.slot ?? DEFAULTS.slot) as InternalOverlay["slot"],
        priority: descriptor.priority ?? DEFAULTS.priority,
      };
      // Replace if same id re-registered.
      ref.current = [...ref.current.filter((o) => o.id !== id), next];
      setOverlays(ref.current);
      writeInsets(ref.current);
      return id;
    },
    [writeInsets],
  );

  const unregister = useCallback(
    (id: string) => {
      ref.current = ref.current.filter((o) => o.id !== id);
      setOverlays(ref.current);
      writeInsets(ref.current);
    },
    [writeInsets],
  );

  const isActive = useCallback(
    (slot: NonNullable<OverlayDescriptor["slot"]>) => overlays.some((o) => o.slot === slot),
    [overlays],
  );

  const list = useCallback(() => overlays, [overlays]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        const root = document.documentElement;
        root.style.setProperty("--edyfra-overlay-top", "0px");
        root.style.setProperty("--edyfra-overlay-bottom", "0px");
        root.style.setProperty("--edyfra-overlay-right", "0px");
      }
    };
  }, []);

  const value = useMemo<OverlayManagerValue>(
    () => ({ register, unregister, isActive, list }),
    [register, unregister, isActive, list],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayManager(): OverlayManagerValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error("useOverlayManager must be used inside <OverlayManagerProvider>");
  }
  return ctx;
}

/**
 * Convenience hook that registers on mount and unregisters on unmount.
 *
 *   useRegisterOverlay({ id: "eddy-chat", edge: "bottom-right", size: 80, slot: "eddy-chat" });
 */
export function useRegisterOverlay(descriptor: OverlayDescriptor, deps: ReadonlyArray<unknown> = []) {
  const { register, unregister } = useOverlayManager();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => descriptor, deps);
  useEffect(() => {
    const id = register(stable);
    return () => unregister(id);
  }, [register, unregister, stable]);
}
