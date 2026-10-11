"use client";

import { useEffect } from "react";
import { tutorHeartbeat } from "@/app/actions/tutor";

const PING_MS = 60_000;

/**
 * Keeps an open tutor dashboard marked as present for instant matching.
 * Pings once on load, every minute while the tab is visible, and again when
 * the tab comes back into view. Renders nothing.
 */
export function TutorPresence() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const ping = () => {
      if (document.visibilityState === "visible") void tutorHeartbeat();
    };
    ping();
    timer = setInterval(ping, PING_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
