"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Mail, User, Calendar, Check, Trash2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { toast } from "sonner";
import { useState } from "react";

export function AdminNotificationsClient({
  notifications,
  stats,
}: {
  notifications: any[];
  stats: any[];
}) {
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");

  const filteredNotifications = notifications.filter(n => {
    if (filter === "read") return n.read;
    if (filter === "unread") return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  const handleMarkAllRead = async () => {
    toast.success("All notifications marked as read");
  };

  const handleClearAll = async () => {
    toast.success("All notifications cleared");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Notifications</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-bold tracking-widest uppercase">Platform communication log</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleMarkAllRead} className="rounded-2xl font-bold px-4 sm:px-6 h-10 sm:h-12 text-xs border-border hover:bg-secondary">
            <Check className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
          <Button variant="outline" onClick={handleClearAll} className="rounded-2xl font-bold px-4 sm:px-6 h-10 sm:h-12 text-xs border-border hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-white/5 bg-white/[0.02] rounded-2xl">
          <CardContent className="p-4 sm:p-6 space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tighter">{notifications.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02] rounded-2xl">
          <CardContent className="p-4 sm:p-6 space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unread</p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-primary">{unreadCount}</h3>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02] rounded-2xl">
          <CardContent className="p-4 sm:p-6 space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Read</p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-emerald-500">{readCount}</h3>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02] rounded-2xl">
          <CardContent className="p-4 sm:p-6 space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scholars</p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tighter">{stats[0]?.value || 0}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 sm:gap-4">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
              filter === f 
                ? "bg-primary text-white shadow-lg" 
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-16 sm:p-20 text-center space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No Notifications</p>
              <p className="text-muted-foreground/60 text-sm font-medium">All caught up! No notifications to display.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredNotifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 sm:p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors group ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex-shrink-0">
                    <AvatarPremium seed={n.user?.name || n.id} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm sm:text-base truncate">{n.title}</p>
                          {!n.read && (
                            <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest flex-shrink-0">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{n.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {n.user?.name || "System"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {n.user?.email || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {n.actionUrl && (
                          <Button 
                            size="sm" 
                            className="rounded-xl font-black text-[9px] tracking-widest uppercase h-8 sm:h-10 px-3 sm:px-4 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                          >
                            <Send className="h-3 w-3 sm:mr-2" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
