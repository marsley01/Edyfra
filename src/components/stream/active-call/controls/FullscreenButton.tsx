"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onClick = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("[FullscreenButton] toggle failed:", err);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="ctrl-btn"
      title={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={isFs}
    >
      <span className="ctrl-icon">
        {isFs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </span>
      <span className="ctrl-label">{isFs ? "Exit" : "Full"}</span>
    </button>
  );
}
