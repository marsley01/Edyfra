"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";
import { usesBrandAccent } from "@/lib/accent";

const CACHE_KEY = "edyfra_accent_color";

/**
 * Applies the signed-in account's accent colour, or the brand colour.
 *
 * Fixed here:
 * - The database default (#8b5cf6) was applied as if the user had chosen it,
 *   so untouched accounts turned violet. It now means "use the brand colour".
 * - The cached colour was never cleared. After one account picked a colour,
 *   every later visitor on that browser (another account, or a signed-out
 *   visitor on the home page) inherited it. The server answer now wins, and
 *   no answer means no override.
 */
function applyAccentColor(color: string | null | undefined) {
  const root = document.documentElement.style;
  if (usesBrandAccent(color)) {
    root.removeProperty("--primary");
    root.removeProperty("--ring");
    return;
  }
  root.setProperty("--primary", color!);
  root.setProperty("--ring", color!);
}

function readCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCache(color: string | null | undefined) {
  try {
    if (color && !usesBrandAccent(color)) localStorage.setItem(CACHE_KEY, color);
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function ThemeColorManager() {
  useEffect(() => {
    let active = true;

    // 1. Cached colour first, so a returning user does not see a flash.
    applyAccentColor(readCache());

    // 2. The server is authoritative.
    getUserData()
      .then((userData) => {
        if (!active) return;
        const accent = (userData as { preferences?: { accentColor?: string } } | null)?.preferences?.accentColor;
        applyAccentColor(accent);
        writeCache(accent);
      })
      .catch(() => {
        // Network trouble: keep whatever the cache applied.
      });

    // 3. Live updates from the settings pages.
    const onChange = (event: Event) => {
      const color = (event as CustomEvent<string>).detail;
      applyAccentColor(color);
      writeCache(color);
    };
    window.addEventListener("accent-color-changed", onChange);

    return () => {
      active = false;
      window.removeEventListener("accent-color-changed", onChange);
    };
  }, []);

  return null;
}
