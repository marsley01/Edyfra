"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";

export function ThemeColorManager() {
  useEffect(() => {
    const applyColor = async () => {
      const userData = await getUserData();
      const accentColor = userData?.settings?.accentColor;
      
      if (accentColor) {
        document.documentElement.style.setProperty("--primary", accentColor);
        document.documentElement.style.setProperty("--ring", accentColor);
        
        // Also update primary-foreground for accessibility if needed
        // For simplicity, we assume dark backgrounds for primary
      }
    };

    applyColor();
    
    // Listen for custom events if we want real-time updates without refresh
    window.addEventListener("accent-color-changed", (e: any) => {
      const color = e.detail;
      document.documentElement.style.setProperty("--primary", color);
      document.documentElement.style.setProperty("--ring", color);
    });

    return () => window.removeEventListener("accent-color-changed", () => {});
  }, []);

  return null;
}
