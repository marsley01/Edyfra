"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { getUserData } from "@/app/actions/user";
import { usesBrandAccent } from "@/lib/accent";

/**
 * Applies the signed-in account's appearance preferences to the whole app:
 * accent colour, font size, layout density and theme.
 *
 * Font size, layout and theme used to be saved by the settings pages and then
 * never read, so changing them did nothing. They are applied here, from the
 * server copy, so they follow the user across devices.
 *
 * Settings pages dispatch `preferences-changed` (or the older
 * `accent-color-changed`) after saving, and the change applies instantly.
 */

const CACHE_KEY = "edyfra_appearance";

type Appearance = {
  accentColor?: string | null;
  fontSize?: string | null;
  layout?: string | null;
  theme?: string | null;
};

function applyAppearance(prefs: Appearance) {
  const root = document.documentElement;

  if (usesBrandAccent(prefs.accentColor)) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
  } else {
    root.style.setProperty("--primary", prefs.accentColor!);
    root.style.setProperty("--ring", prefs.accentColor!);
  }

  // Tailwind sizes are rem-based, so scaling the root font scales the UI.
  if (prefs.fontSize === "large") root.dataset.fontSize = "large";
  else delete root.dataset.fontSize;

  // "compact" is the stored default and matches the existing design, so only
  // "comfortable" changes anything (see globals.css).
  if (prefs.layout === "comfortable") root.dataset.layout = "comfortable";
  else delete root.dataset.layout;
}

function readCache(): Appearance | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Appearance;
    // Older cache key that only held the accent colour.
    const legacy = localStorage.getItem("edyfra_accent_color");
    return legacy ? { accentColor: legacy } : null;
  } catch {
    return null;
  }
}

function writeCache(prefs: Appearance | null) {
  try {
    localStorage.removeItem("edyfra_accent_color");
    if (prefs) localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function ThemeColorManager() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;
    let current: Appearance = readCache() ?? {};

    // 1. Cached values first, so a returning user does not see a flash.
    applyAppearance(current);

    // 2. The server copy is authoritative. Signed-out visitors get defaults.
    getUserData()
      .then((userData) => {
        if (!active) return;
        const p = (userData as { preferences?: Appearance } | null)?.preferences ?? null;
        current = p
          ? { accentColor: p.accentColor, fontSize: p.fontSize, layout: p.layout, theme: p.theme }
          : {};
        applyAppearance(current);
        writeCache(p ? current : null);
        // Only follow a theme the user explicitly picked; the stored default
        // "system" leaves whatever this device already uses alone.
        if (p?.theme && p.theme !== "system" && p.theme !== theme) setTheme(p.theme);
      })
      .catch(() => {
        // Network trouble: keep whatever the cache applied.
      });

    // 3. Live updates from the settings pages.
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Appearance | string>).detail;
      const patch = typeof detail === "string" ? { accentColor: detail } : detail ?? {};
      current = { ...current, ...patch };
      applyAppearance(current);
      writeCache(current);
    };
    window.addEventListener("preferences-changed", onChange);
    window.addEventListener("accent-color-changed", onChange);

    return () => {
      active = false;
      window.removeEventListener("preferences-changed", onChange);
      window.removeEventListener("accent-color-changed", onChange);
    };
    // Run once per page load; `theme` is only read for the comparison above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
