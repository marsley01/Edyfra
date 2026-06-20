"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function PushNotificationInit() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

   useEffect(() => {
     if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
       return;
     }
     setSupported(true);
     setPermission(Notification.permission);

     navigator.serviceWorker.ready
       .then((reg) => {
         return reg.pushManager.getSubscription();
       })
       .then((sub) => {
         setSubscribed(!!sub);
       })
       .catch((err) => {
         console.error("[PushNotificationInit] Error checking subscription:", err);
       });
   }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        showError({
          title: "Notifications denied",
          cause: "You said no to notification permissions.",
          fix: "Open your browser settings and allow notifications for Edyfra.",
        });
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        showError({
          title: "Push isn't ready yet",
          cause: "Browser push isn't configured on the server.",
          fix: "We'll let you know once it's live.",
        });
        return;
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        showError({
          title: "Push isn't ready yet",
          cause: "Browser push isn't configured on the server.",
          fix: "We'll let you know once it's live.",
        });
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const raw = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: raw.keys,
        }),
      });

      setSubscribed(true);
      showSuccess("Push is on", { description: "We'll ping your browser when something new lands." });
    } catch {
      showError({
        title: "Couldn't turn on push",
        cause: "The browser didn't accept the request.",
        fix: "Check your browser settings, then try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const raw = sub.toJSON();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: raw.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      showSuccess("Push is off", { description: "You won't get browser pings anymore." });
    } catch {
      showError({
        title: "Couldn't turn off push",
        cause: "We couldn't reach the server.",
        fix: "Try again, or refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) return null;

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        Notifications blocked
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="text-xs gap-2 rounded-xl"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-3.5 w-3.5 text-primary" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      {subscribed ? "Push On" : "Push Off"}
    </Button>
  );
}
