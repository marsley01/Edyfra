"use client";

import { useEffect } from "react";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function PushSubscriptionManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          return;
        }

        const res = await fetch("/api/push/vapid-public-key");
        if (!res.ok) return;
        const { publicKey } = await res.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      } catch {
        // silently fail — user might have denied permission
      }
    };

    if (Notification.permission === "granted") {
      subscribe();
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") subscribe();
      });
    }
  }, []);

  return null;
}
