"use client";

import { useEffect, useRef, useState } from "react";
import { CallingState } from "@stream-io/video-react-sdk";

/**
 * Live elapsed-second counter that resets whenever the call leaves the
 * JOINED state. Returns 0 while not joined.
 */
export function useCallElapsed(callingState: CallingState): number {
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callingState]);

  return elapsed;
}

export function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
