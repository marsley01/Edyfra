"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";

function applyAccentColor(color: string | null | undefined) {
  if (!color) return;
  document.documentElement.style.setProperty("--primary", color);
  document.documentElement.style.setProperty("--ring", color);
}

function getCachedAccentColor(): string | null {
  try {
    return localStorage.getItem("edyfra_accent_color");
  } catch {
    return null;
  }
}

function setCachedAccentColor(color: string | null) {
  try {
    if (color) {
      localStorage.setItem("edyfra_accent_color", color);
    } else {
      localStorage.removeItem("edyfra_accent_color");
    }
  } catch { /* noop */ }
}

export function ThemeColorManager() {
  useEffect(() => {
    // 1. Apply cached color immediately — no flash
    const cached = getCachedAccentColor();
    if (cached) {
      applyAccentColor(cached);
    }

    // 2. Fetch authoritative color from server, update cache
    const applyColor = async () => {
      try {
        const userData = await getUserData();
        const settings = userData?.settings as Record<string, unknown> | undefined;
        const accentColor = settings?.accentColor as string | undefined;

        if (accentColor) {
          applyAccentColor(accentColor);
          setCachedAccentColor(accentColor);
        }
      } catch {
        // Silently fall back to cached value if fetch fails
      }
    };

    applyColor();

    // 3. Listen for real-time changes from settings
    const handleColorChange = (e: Event) => {
      const color = (e as CustomEvent).detail;
      if (color) {
        applyAccentColor(color);
        setCachedAccentColor(color);
      }
    };

    window.addEventListener("accent-color-changed", handleColorChange);

    return () => window.removeEventListener("accent-color-changed", handleColorChange);
  }, []);

  return null;
}
