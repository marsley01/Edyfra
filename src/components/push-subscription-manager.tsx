"use client";

import { useEffect } from "react";
import { urlBase64ToUint8Array } from "@/lib/utils";

/**
 * Auto-subscribes the current user to push notifications if browser permission
 * is already granted. Idempotent: if a browser subscription already exists,
 * we make sure it's also saved on the server. Does NOT re-subscribe if the
 * browser already has a valid subscription, to avoid endpoint churn.
 */
export function PushSubscriptionManager() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const syncSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (existing) {
          // Make sure the server has a row for this endpoint. The browser is
          // the source of truth for the subscription — if it exists here, the
          // server should know about it.
          const raw = existing.toJSON();
          try {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: raw.endpoint,
                keys: raw.keys,
              }),
            });
          } catch {
            // Network blip — will retry on next page load
          }
          return;
        }

        // No browser subscription — only auto-create if permission was already
        // granted (we don't surprise users with the prompt).
        if (Notification.permission !== "granted") return;

        const res = await fetch("/api/push/vapid-public-key");
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const raw = subscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: raw.endpoint,
            keys: raw.keys,
          }),
        });
      } catch {
        // silently fail — user might have denied permission, or SW not ready
      }
    };

    if (Notification.permission === "granted") {
      syncSubscription();
    }
  }, []);

  return null;
}
