"use client";

import { useEffect } from "react";
import { getUserData } from "@/app/actions/user";

export function ThemeColorManager() {
  useEffect(() => {
    const applyColor = async () => {
      const userData = await getUserData();
<<<<<<< HEAD
      const settings = userData?.settings as Record<string, unknown> | undefined;
      let accentColor = settings?.accentColor as string | undefined;
      
      // Override old default purple with the Edyfra Blue default
      if (accentColor === "#8b5cf6") {
        accentColor = "#0071e3";
      }
=======
      const accentColor = userData?.preferences?.accentColor;
>>>>>>> origin/main
      
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
