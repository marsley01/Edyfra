"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone, CheckCircle2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { urlBase64ToUint8Array } from "@/lib/utils";

type SupportState = "loading" | "unsupported" | "ready";

export function PushNotificationManager() {
  const [support, setSupport] = useState<SupportState>("loading");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [swState, setSwState] = useState<string>("unknown");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setSupport("unsupported");
      return;
    }
    setSupport("ready");
    setPermission(Notification.permission);

    navigator.serviceWorker.ready
      .then((reg) => {
        setSwState(reg.active?.state || "activated");
        return reg.pushManager.getSubscription();
      })
      .then((sub) => {
        setSubscribed(!!sub);
      })
      .catch(() => {
        setSwState("error");
      });
  }, []);

  const subscribe = useCallback(async () => {
    if (support !== "ready") return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        if (result === "denied") {
          toast.error("Notifications blocked", {
            description: "Unlock them in your browser's site settings to receive push.",
          });
        } else {
          toast.error("Permission not granted");
        }
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        toast.error("Push isn't configured on the server", {
          description: "Ask an admin to set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        });
        return;
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        toast.error("No VAPID public key returned");
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
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: raw.keys,
        }),
      });

      if (!saveRes.ok) {
        toast.error("Subscription saved locally, but the server rejected it");
        return;
      }

      setSubscribed(true);
      toast.success("Browser notifications are on");
    } catch (err: any) {
      console.error("[push subscribe]", err);
      toast.error("Couldn't enable browser notifications", {
        description: err?.message || "Try again, or check the browser console for details.",
      });
    } finally {
      setLoading(false);
    }
  }, [support]);

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
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Browser notifications are off");
    } catch {
      toast.error("Failed to disable");
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Test failed");
      }
      toast.success("Test sent! Check your notification list and OS tray.", {
        description: "If nothing appears in your OS tray, your browser may be blocking them.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  }, []);

  if (support === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking browser support…
      </div>
    );
  }

  if (support === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5" />
        Your browser doesn&apos;t support push notifications.
      </div>
    );
  }

  const isBlocked = permission === "denied";
  const isGranted = permission === "granted";
  const isActive = subscribed && isGranted;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isActive ? "bg-emerald-500/10 text-emerald-500" :
              isBlocked ? "bg-red-500/10 text-red-500" :
              "bg-primary/10 text-primary"
            }`}>
              {isActive ? <BellRing className="h-5 w-5" /> :
               isBlocked ? <BellOff className="h-5 w-5" /> :
               <Bell className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <p className="font-black text-sm">Browser push notifications</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                Get a system notification (with sound) the moment something happens — even if Edyfra isn&apos;t open.
              </p>
            </div>
          </div>
          <Badge
            className={
              isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
              isBlocked ? "bg-red-500/10 text-red-500 border-red-500/20" :
              "bg-secondary text-muted-foreground border-border"
            }
          >
            {isActive ? <><CheckCircle2 className="h-3 w-3 mr-1" /> On</> :
             isBlocked ? <><BellOff className="h-3 w-3 mr-1" /> Blocked</> :
             "Off"}
          </Badge>
        </div>

        {/* Diagnostic row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/40">
            <Smartphone className="h-3 w-3" />
            <span>Permission:</span>
            <span className={`ml-auto ${isGranted ? "text-emerald-500" : isBlocked ? "text-red-500" : "text-foreground"}`}>
              {permission}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/40">
            {subscribed ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>Subscription:</span>
            <span className={`ml-auto ${subscribed ? "text-emerald-500" : "text-foreground"}`}>
              {subscribed ? "Active" : "None"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/40">
            <Loader2 className={`h-3 w-3 ${swState === "activated" ? "" : "animate-spin"}`} />
            <span>Service worker:</span>
            <span className="ml-auto text-foreground">{swState}</span>
          </div>
        </div>

        {isBlocked && (
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-red-500">Notifications are blocked.</strong> Click the lock icon in your browser&apos;s address bar, then allow notifications for this site.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={sendTest}
                disabled={testing}
                className="rounded-full font-bold text-xs uppercase tracking-widest gap-2"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={unsubscribe}
                disabled={loading}
                className="rounded-full font-bold text-xs uppercase tracking-widest gap-2"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
                Turn off
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={subscribe}
              disabled={loading || isBlocked}
              className="rounded-full font-bold text-xs uppercase tracking-widest gap-2"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              {isBlocked ? "Blocked by browser" : "Enable browser notifications"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
