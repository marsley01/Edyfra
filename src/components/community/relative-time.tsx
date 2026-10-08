"use client";

import { useSyncExternalStore } from "react";
import { formatAbsoluteDate, formatRelative } from "@/lib/social-utils";

/* One shared 30s ticker for every timestamp on the page. The server snapshot
   is null, so SSR and the hydration pass render the same deterministic
   absolute date; the client then swaps in "5m" / "3h" without a mismatch. */

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return now || (now = Date.now());
}

function getServerSnapshot() {
  return 0;
}

export function useNow(): number | null {
  const n = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return n || null;
}

export function RelativeTime({ iso, className, suffix = false }: { iso: string; className?: string; suffix?: boolean }) {
  const n = useNow();
  const label = n ? formatRelative(iso, n) : formatAbsoluteDate(iso);
  const isShort = /^\d+[mhd]$/.test(label);
  return (
    <time dateTime={iso} title={formatAbsoluteDate(iso)} className={className}>
      {label}
      {suffix && isShort ? " ago" : ""}
    </time>
  );
}
