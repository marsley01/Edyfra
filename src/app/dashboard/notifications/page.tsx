"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, Megaphone, Zap, Star, Trophy, CheckCircle, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getNotifications, markAllRead, markNotificationRead } from "@/app/actions/notifications";

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    } finally {
      setMarking(false);
    }
  };

  const handleMarkRead = async (id: string, actionUrl?: string | null) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (actionUrl && actionUrl !== "/dashboard/notifications") {
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
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tightest flex items-center gap-3">
            <BellRing className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white font-black text-xs px-2 py-0.5 rounded-full">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            All your alerts, matches, and announcements in one place.
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
        <div className="flex flex-col items-center justify-center py-24 space-y-6 border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black">All caught up!</h3>
            <p className="text-muted-foreground font-medium">
              You&apos;ll see matches, announcements, and points here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((n, i) => {
              const Icon = TYPE_ICONS[n.type] || TYPE_ICONS.DEFAULT;
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.DEFAULT;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
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
                      <p className={`text-sm font-black leading-tight ${n.read ? "text-foreground" : "text-foreground"}`}>
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

                  {!n.read && (
                    <CheckCircle className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
