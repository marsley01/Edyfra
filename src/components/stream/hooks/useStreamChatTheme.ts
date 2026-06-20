"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Resolves the Stream Chat theme class based on the active next-themes
 * mode. Returns "light" on the very first render to avoid a flash from
 * `undefined` → resolved.
 */
export function useStreamChatTheme(): string {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && resolvedTheme === "dark"
    ? "str-chat__theme-dark"
    : "str-chat__theme-light";
}
