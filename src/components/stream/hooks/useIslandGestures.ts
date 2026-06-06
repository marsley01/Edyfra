"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseLongPressOptions {
  delay?: number;
  onLongPress: () => void;
}

interface UseLongPressReturn {
  handlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
  didLongPressRef: React.MutableRefObject<boolean>;
}

/**
 * iOS-style long-press detector. Returns pointer handlers and a ref the
 * consumer can read in their onClick to suppress the click that fires
 * immediately after a long-press.
 */
export function useLongPress({ delay = 500, onLongPress }: UseLongPressOptions): UseLongPressReturn {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(() => {
    didLongPress.current = false;
    clear();
    timer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, delay);
  }, [clear, delay, onLongPress]);

  return {
    didLongPressRef: didLongPress,
    handlers: {
      onPointerDown,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    },
  };
}

/**
 * Closes a panel when the user clicks/taps outside the given ref.
 * Skips clicks on elements with `data-edyfra-island-pill` so the pill can
 * keep toggling via its own handler.
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current) return;
      if (ref.current.contains(t)) return;
      if (t.closest("[data-edyfra-island-pill]")) return;
      onOutside();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, active, onOutside]);
}

/**
 * Closes a panel when the user hits Escape.
 */
export function useEscapeToClose(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}
