"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, Megaphone, Zap, Star, Trophy, Loader2, CheckCheck, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess, showUnknownError } from "@/lib/toast";
import { formatDistanceToNow } from "date-fns";
import { getNotifications, markAllRead, markNotificationRead } from "@/app/actions/notifications";
import { createClient } from "@/utils/supabase/client";
import { LottieAnimation } from "@/components/lottie-animation";

const TYPE_ICONS: Record<string, any> = {
  ANNOUNCEMENT: Megaphone,
  MATCH_FOUND: Zap,
  POINTS_EARNED: Trophy,
  REVIEW_RECEIVED: Star,
  DEFAULT: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  ANNOUNCEMENT: "bg-violet-500/10 text-violet-500",
  MATCH_FOUND: "bg-emerald-500/10 text-emerald-500",
  POINTS_EARNED: "bg-yellow-500/10 text-yellow-600",
  REVIEW_RECEIVED: "bg-blue-500/10 text-blue-500",
  DEFAULT: "bg-primary/10 text-primary",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

export default function TutorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
    } catch {
      showError({
        title: "We couldn't load your notifications",
        cause: "Something hiccuped on our side.",
        fix: "Pull down to refresh in a moment, or check your connection.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (cancelled || !data.user) return;
      const userId = data.user.id;

      const channel = supabase
        .channel(`tutor-notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Notification",
            filter: `userId=eq.${userId}`,
          },
          () => {
            load();
          }
        )
        .subscribe((status: string) => {
          setConnected(status === "SUBSCRIBED");
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }).catch((err: unknown) => {
      console.error("[TutorNotifications] realtime setup failed", err);
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showSuccess("All caught up", { description: "Every notification is marked as read." });
    } catch {
      showError({
        title: "Couldn't update notifications",
        cause: "Our database didn't take the change.",
        fix: "Try again — if it keeps happening, refresh the page.",
      });
    } finally {
      setMarking(false);
    }
  };

  const handleMarkRead = async (id: string, actionUrl?: string | null) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <BellRing className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white font-black text-xs px-2 py-0.5 rounded-full">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 flex-wrap">
            Student requests, matches, earnings, and announcements.
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              {connected ? (
                <><Wifi className="h-3 w-3 text-emerald-500" /> Live</>
              ) : (
                <><WifiOff className="h-3 w-3 text-muted-foreground" /> Refreshing</>
              )}
            </span>
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={marking}
            className="rounded-full gap-2 font-bold text-xs uppercase tracking-widest h-10"
          >
            {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-6 border-2 border-dashed border-border rounded-3xl">
          <div className="w-48 h-48">
            <LottieAnimation url="/animations/confetti.json" loop autoplay={false} />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h3 className="text-xl font-black">You&apos;re all clear</h3>
            <p className="text-muted-foreground font-medium">
              New student requests, session updates, and earnings alerts will pop up here as they come in.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || TYPE_ICONS.DEFAULT;
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.DEFAULT;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  onClick={() => handleMarkRead(n.id, n.actionUrl)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
                    n.read
                      ? "bg-background border-border hover:bg-secondary/50"
                      : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black leading-tight text-foreground">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
