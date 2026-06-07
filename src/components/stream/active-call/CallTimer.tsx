"use client";

import { useEffect, useState } from "react";

interface CallTimerProps {
  /** When the call started. Defaults to "now" on mount. */
  startTime?: Date;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${pad2(h)}:${pad2(m)}:${pad2(s)}`
    : `${pad2(m)}:${pad2(s)}`;
}

/**
 * Live call duration display. Ticks every second, formatted HH:MM:SS once the
 * call crosses the 1-hour mark. Pure — no Stream SDK dependency.
 */
export function CallTimer({ startTime }: CallTimerProps) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const start = (startTime ?? new Date()).getTime();
    const tick = () => setElapsed(formatDuration(Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return <span className="call-timer">{elapsed}</span>;
}
