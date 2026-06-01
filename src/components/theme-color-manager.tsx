"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";

export function ThemeColorManager() {
  useEffect(() => {
    const applyColor = async () => {
      const userData = await getUserData();
      const accentColor = userData?.preferences?.accentColor;
      
      if (accentColor) {
        document.documentElement.style.setProperty("--primary", accentColor);
        document.documentElement.style.setProperty("--ring", accentColor);
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
