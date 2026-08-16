"use client";

import { useEffect, useCallback, useRef } from "react";

type ModifierKey = "ctrl" | "meta" | "shift" | "alt";
type KeyCombo = string | { key: string; modifiers?: ModifierKey[] };

const MODIFIER_MAP: Record<ModifierKey, string> = {
  ctrl: "ctrlKey",
  meta: "metaKey",
  shift: "shiftKey",
  alt: "altKey",
};

export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: (e: KeyboardEvent) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const key = typeof combo === "string" ? combo : combo.key;
      const modifiers = typeof combo === "string" ? [] : combo.modifiers || [];

      const targetKey = key.toLowerCase();
      const pressedKey = e.key.toLowerCase();

      if (pressedKey !== targetKey) return;

      const allModifiersMatch = modifiers.every((mod) => {
        const prop = MODIFIER_MAP[mod] as keyof KeyboardEvent;
        return Boolean(e[prop]);
      });

      if (allModifiersMatch) {
        e.preventDefault();
        handlerRef.current(e);
      }
    },
    [combo, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
