"use client";

import { useEffect, useState } from "react";
import { getUnreadCount, getLatestNotification } from "@/app/actions/notifications";
import type { Notification } from "@/generated/client";

interface UnreadState {
  count: number;
  latestId: string | null;
  latest: Pick<Notification, "id" | "title" | "body" | "createdAt" | "type" | "actionUrl"> | null;
  markRead: () => void;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 20_000; // fallback only; pushes trigger an immediate refresh

/** Fired whenever a new notification is seen; the notifications pages reload on it. */
export const NOTIFICATIONS_CHANGED_EVENT = "edyfra:notifications-changed";

let pushSubscribed: boolean | null = null;
async function hasPushSubscription(): Promise<boolean> {
  if (pushSubscribed !== null) return pushSubscribed;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    pushSubscribed = !!(await reg?.pushManager.getSubscription());
  } catch {
    pushSubscribed = false;
  }
  return pushSubscribed;
}

// The service worker posts a message when a push arrives: refresh right away
// instead of waiting for the next poll, so the bell and list match the alert.
let swListening = false;
function listenForPushes() {
  if (swListening || typeof navigator === "undefined" || !navigator.serviceWorker) return;
  swListening = true;
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "edyfra-push") void refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
}

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

    if (cached && latest) {
      const isNew = !cached.latestId || cached.latestId !== latest.id;
      if (isNew) {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
        const createdAge = Date.now() - new Date(latest.createdAt).getTime();
        if (createdAge < 5 * 60 * 1000 && "Notification" in window) {
          // A browser with a push subscription already got this from the
          // service worker; showing it here too produced the same alert twice,
          // the second one up to a poll interval later.
          if (Notification.permission === "granted" && !(await hasPushSubscription())) {
            try {
              new Notification(latest.title || "New notification", {
                body: latest.body || "",
                icon: "/icons/icon-192.png",
                // Same tag the service worker uses, so they never stack.
                tag: `edyfra-${latest.id}`,
              });
            } catch {}
          }
          const audio = new Audio("/sounds/popcorn.mp3");
          audio.play().catch(() => {});
        }
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
            createdAt: latest.createdAt,
            type: latest.type,
            actionUrl: latest.actionUrl,
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
  listenForPushes();
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
