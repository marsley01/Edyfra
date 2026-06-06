"use client";

import { useEffect, useState, useCallback } from "react";
import { getUnreadCount, getLatestNotification } from "@/app/actions/notifications";

interface UnreadState {
  count: number;
  latestId: string | null;
  latest: { id: string; title: string; body: string; createdAt: Date; type: string; actionUrl?: string | null } | null;
  markRead: () => void;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 20_000; // 20s — slightly faster than the previous 30s

// Module-level cache so multiple components (bell + nav badges) share a single
// polling cycle and don't all hit the server independently.
let cached: UnreadState | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

async function refresh(): Promise<void> {
  try {
    const [count, latest] = await Promise.all([
      getUnreadCount(),
      getLatestNotification(),
    ]);

    if (cached && latest && cached.latestId && cached.latestId !== latest.id) {
      const createdAge = Date.now() - new Date(latest.createdAt as any).getTime();
      if (createdAge < 5 * 60 * 1000 && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(latest.title || "New notification", {
              body: latest.body || "",
              icon: "/icons/icon-192.png",
              tag: `edyfra-${latest.id}`,
            });
          } catch {}
        }
        const audio = new Audio("/sounds/popcorn.mp3");
        audio.play().catch(() => {});
      }
    }

    cached = {
      count,
      latestId: latest?.id ?? null,
      latest: latest
        ? {
            id: latest.id,
            title: latest.title,
            body: latest.body,
            createdAt: latest.createdAt as any,
            type: (latest as any).type,
            actionUrl: (latest as any).actionUrl,
          }
        : null,
      markRead: () => {
        if (cached) {
          cached = { ...cached, count: Math.max(0, cached.count - 1) };
          notify();
        }
      },
      refresh,
    };
    notify();
  } catch (err) {
    console.error("[useUnreadNotifications] refresh failed", err);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollTimer) return;
  refresh();
  pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Shared hook for unread notification count. All mounted components share a
 * single polling cycle. Auto-starts polling on first mount, stops when the
 * last component unmounts.
 */
export function useUnreadNotifications(): UnreadState {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!cached) {
      cached = {
        count: 0,
        latestId: null,
        latest: null,
        markRead: () => {},
        refresh,
      };
    }
    startPolling();
    const cb = () => setTick((t) => t + 1);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
      if (subscribers.size === 0) stopPolling();
    };
  }, []);

  return (
    cached || {
      count: 0,
      latestId: null,
      latest: null,
      markRead: () => {},
      refresh: async () => {},
    }
  );
}
