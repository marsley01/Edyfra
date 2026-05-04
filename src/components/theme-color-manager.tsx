"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";

export function ThemeColorManager() {
  useEffect(() => {
    const applyColor = async () => {
      const userData = await getUserData();
      const settings = userData?.settings as Record<string, unknown> | undefined;
      const accentColor = settings?.accentColor as string | undefined;
      
      if (accentColor) {
        document.documentElement.style.setProperty("--primary", accentColor);
        document.documentElement.style.setProperty("--ring", accentColor);
        
        // Also update primary-foreground for accessibility if needed
        // For simplicity, we assume dark backgrounds for primary
      }
    };

    applyColor();
    
    const handleColorChange = (e: Event) => {
      const color = (e as CustomEvent).detail;
      document.documentElement.style.setProperty("--primary", color);
      document.documentElement.style.setProperty("--ring", color);
    };

    window.addEventListener("accent-color-changed", handleColorChange);

    return () => window.removeEventListener("accent-color-changed", handleColorChange);
  }, []);

  return null;
}
