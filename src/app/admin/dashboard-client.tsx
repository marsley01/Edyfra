"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users, GraduationCap, MessageSquare, TrendingUp, Activity, Clock,
  CheckCircle2, BarChart3, BookOpen, Calendar, UserPlus, Timer,
  Award, ArrowUpRight, ArrowRight, Eye, Flame, Sparkles, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SheetsImportModal } from "@/components/admin/SheetsImportModal";
import { FileSpreadsheet } from "lucide-react";

/* ─────────────────────────── Design Tokens ─────────────────────────── */
const STAT_CARDS = [
  { icon: Users, gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-500/8", ring: "ring-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  { icon: GraduationCap, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-500/8", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  { icon: MessageSquare, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-500/8", ring: "ring-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
  { icon: TrendingUp, gradient: "from-amber-500 to-orange-600", bg: "bg-amber-500/8", ring: "ring-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
];

/* ─────────────────────────── Interfaces ─────────────────────────── */
interface Stat {
  label: string;
  value: number;
  trend: string;
}

export function AdminDashboardClient({
  stats,
  telemetry,
  pendingApplications,
  recentUsers,
  systemLoad,
  completedSessions,
  analytics,
  tutorMetrics,
  sessionMetrics,
  bookingMetrics,
  acquisitionMetrics,
}: {
  stats: Stat[];
  telemetry: any[];
  pendingApplications: any[];
  recentUsers: any[];
  systemLoad: number;
  completedSessions: number;
  analytics: any;
  tutorMetrics: {
    avgResponseRate: number;
    avgRating: number;
    totalAssigned: number;
    totalResponded: number;
    idleTutors: number;
  };
  sessionMetrics: {
    topSubjects: { subject: string; count: number }[];
    peakHours: { hour: number; count: number }[];
    totalCompleted: number;
  };
  bookingMetrics: {
    confirmed: number;
    declined: number;
    studentNoShow: number;
    tutorNoShow: number;
    today: number;
  };
  acquisitionMetrics: {
    direct: number;
    referral: number;
    total: number;
    signupsToday: number;
    signupsThisWeek: number;
    signupsThisMonth: number;
  };
}) {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const interval = setInterval(() => setTime(new Date()), 300000);
    return () => clearInterval(interval);
  }, []);

  const bookingConfirmRate = bookingMetrics.confirmed + bookingMetrics.declined > 0
    ? Math.round((bookingMetrics.confirmed / (bookingMetrics.confirmed + bookingMetrics.declined)) * 100)
    : 0;

  const sessionCompleteRate = sessionMetrics.totalCompleted + (stats[2]?.value || 0) > 0
    ? Math.round((sessionMetrics.totalCompleted / (sessionMetrics.totalCompleted + (stats[2]?.value || 0))) * 100)
    : 0;

  const maxTelemetry = telemetry.length > 0
    ? Math.max(...telemetry.map((t) => typeof t.value === "number" ? t.value : 0), 1)
    : 1;

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">

      {/* ───────── Hero Header ───────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-muted-foreground font-medium"
          >
            {greeting} 👋
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            Dashboard Overview
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm"
          >
            Here&apos;s what&apos;s happening across Edyfra today.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hidden sm:flex">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">All systems online</span>
          </div>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-full gap-2 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import Data
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="rounded-full gap-2 text-xs"
          >
            <Clock className="h-3.5 w-3.5" />
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Button>
        </motion.div>
      </div>

      {/* ───────── Acquisition Quick Cards ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Today", value: acquisitionMetrics.signupsToday, icon: Flame, color: "text-orange-500", bg: "bg-orange-500/8" },
          { label: "This Week", value: acquisitionMetrics.signupsThisWeek, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/8" },
          { label: "This Month", value: acquisitionMetrics.signupsThisMonth, icon: UserPlus, color: "text-violet-500", bg: "bg-violet-500/8" },
          { label: "Referral Rate", value: acquisitionMetrics.total > 0 ? Math.round((acquisitionMetrics.referral / acquisitionMetrics.total) * 100) : 0, icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/8", suffix: "%" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="border-border/40 hover:border-border/80 transition-all duration-300 hover:shadow-md group">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className={`${item.bg} p-2.5 rounded-xl transition-transform group-hover:scale-110`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                    {item.value.toLocaleString()}{item.suffix || ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ───────── Main KPI Cards ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat, i) => {
          const config = STAT_CARDS[i];
          const Icon = config?.icon || Users;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <Card className="border-border/40 hover:border-border/80 overflow-hidden transition-all duration-300 hover:shadow-lg group relative">
                {/* Subtle gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config?.gradient || "from-blue-500 to-indigo-600"} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                <CardContent className="p-5 sm:p-6 space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`${config?.bg || "bg-blue-500/8"} p-2.5 rounded-xl ring-1 ${config?.ring || "ring-blue-500/20"} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${config?.text || "text-blue-500"}`} />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                      {stat.value.toLocaleString()}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ───────── Main Grid: Left (Content) + Right (Sidebar) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══════ LEFT COLUMN ══════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Tutor Applications */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/40 overflow-hidden">
              <CardHeader className="p-5 sm:p-6 flex flex-row items-center justify-between border-b border-border/40">
                <div>
                  <CardTitle className="text-lg font-semibold tracking-tight">Pending Applications</CardTitle>
                  <CardDescription className="text-sm mt-0.5">Review and approve tutor candidates.</CardDescription>
                </div>
                <Link href="/admin/tutors">
                  <Button variant="ghost" size="sm" className="rounded-full gap-1 text-xs font-medium">
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {pendingApplications.length === 0 ? (
                  <div className="p-10 sm:p-16 text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">You&apos;re all caught up!</p>
                    <p className="text-xs text-muted-foreground/60">No pending applications right now.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {pendingApplications.slice(0, 5).map((app) => (
                      <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <AvatarPremium seed={app.user?.name || app.id} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{app.user?.name || "Expert Candidate"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {app.subjects?.join(", ") || "General Expertise"}
                            </p>
                          </div>
                        </div>
                        <Link href="/admin/tutors">
                          <Button size="sm" className="rounded-full text-xs gap-1 h-8 px-4">
                            Review <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tutor Performance Strip */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Avg Response Rate", value: `${tutorMetrics.avgResponseRate.toFixed(0)}%`, icon: Activity, color: "text-blue-500" },
                { label: "Avg Rating", value: tutorMetrics.avgRating.toFixed(1), icon: Award, color: "text-amber-500" },
                { label: "Responded / Assigned", value: `${tutorMetrics.totalResponded}/${tutorMetrics.totalAssigned}`, icon: CheckCircle2, color: "text-emerald-500" },
                { label: "Available Tutors", value: tutorMetrics.idleTutors.toString(), icon: Users, color: "text-violet-500" },
              ].map((m) => (
                <Card key={m.label} className="border-border/40">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                      <p className="text-[11px] font-medium">{m.label}</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums tracking-tight">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Sessions & Bookings Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Session Metrics */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/40 h-full">
                <CardHeader className="p-5 pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Completion Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${sessionCompleteRate}%` }} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{sessionCompleteRate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Completed</span>
                    <span className="text-sm font-semibold tabular-nums">{sessionMetrics.totalCompleted}</span>
                  </div>
                  {sessionMetrics.topSubjects.slice(0, 3).map(s => (
                    <div key={s.subject} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground truncate mr-2">{s.subject}</span>
                      <Badge variant="secondary" className="text-[10px] font-medium rounded-full shrink-0">
                        {s.count}
                      </Badge>
                    </div>
                  ))}
                  {sessionMetrics.peakHours.length > 0 && (
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-[11px] text-muted-foreground font-medium mb-2">Peak Hours</p>
                      <div className="flex gap-1 items-end h-14">
                        {sessionMetrics.peakHours.slice(0, 6).map(h => {
                          const maxCount = Math.max(...sessionMetrics.peakHours.map(p => p.count), 1);
                          return (
                            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-primary/15 hover:bg-primary/30 rounded-sm transition-colors"
                                style={{ height: `${Math.max((h.count / maxCount) * 100, 8)}%` }}
                              />
                              <span className="text-[9px] text-muted-foreground tabular-nums">{h.hour}h</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Booking Metrics */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="border-border/40 h-full">
                <CardHeader className="p-5 pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Today&apos;s Bookings</span>
                    <span className="text-sm font-semibold tabular-nums">{bookingMetrics.today}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Confirmation Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${bookingConfirmRate}%` }} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{bookingConfirmRate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Confirmed</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{bookingMetrics.confirmed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Declined</span>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">{bookingMetrics.declined}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Student No-Show</span>
                    <span className="text-sm font-semibold text-amber-500 tabular-nums">{bookingMetrics.studentNoShow}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Tutor No-Show</span>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">{bookingMetrics.tutorNoShow}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Engagement Metrics */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-border/40">
              <CardHeader className="p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Daily Active", value: analytics.dau || 0 },
                    { label: "7-Day Retention", value: `${analytics.day7Retention?.rate || 0}%` },
                    { label: "30-Day Retention", value: `${analytics.day30Retention?.rate || 0}%` },
                    { label: "Acquisition", value: `${acquisitionMetrics.referral}R / ${acquisitionMetrics.direct}D` },
                  ].map((e) => (
                    <div key={e.label} className="text-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">{e.label}</p>
                      <p className="text-lg sm:text-xl font-bold tabular-nums">{e.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ══════ RIGHT COLUMN ══════ */}
        <div className="space-y-5">

          {/* System Health */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/40 bg-gradient-to-b from-card to-muted/20 overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {[
                  {
                    label: "Database",
                    status: stats[0]?.value !== undefined ? "Connected" : "Checking...",
                    ok: stats[0]?.value !== undefined,
                    detail: `${stats[0]?.value || 0} users`,
                    pct: stats[0]?.value !== undefined ? 100 : 0,
                  },
                  {
                    label: "Live Sessions",
                    status: stats[2]?.value > 0 ? `${stats[2].value} active` : "Idle",
                    ok: true,
                    detail: `${completedSessions || 0} completed`,
                    pct: stats[2]?.value > 0 ? Math.min((stats[2].value / Math.max(stats[0]?.value || 1, 1)) * 100, 100) : 0,
                  },
                  {
                    label: "Tutor Queue",
                    status: pendingApplications.length > 0 ? `${pendingApplications.length} pending` : "Clear",
                    ok: pendingApplications.length === 0,
                    detail: pendingApplications.length > 0 ? "Needs review" : "All up to date",
                    pct: pendingApplications.length > 0 ? Math.min(pendingApplications.length * 15, 100) : 0,
                  },
                ].map(v => (
                  <div key={v.label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{v.label}</span>
                      <span className={`text-xs font-medium ${v.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${v.pct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${v.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">{v.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recently Joined */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/40">
              <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Signups</CardTitle>
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm" className="rounded-full text-xs h-7 px-2.5 gap-1">
                    <Eye className="h-3 w-3" /> All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2.5">
                {recentUsers.length > 0 ? (
                  recentUsers.slice(0, 6).map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {u.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium truncate">{u.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium rounded-full ml-2 shrink-0">
                        {u.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No users yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Retention Snapshot */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-border/40">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" /> Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Day 7</span>
                    <span className="text-sm font-semibold tabular-nums">{analytics.day7Retention?.rate || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(analytics.day7Retention?.rate || 0, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-primary rounded-full h-2"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Day 30</span>
                    <span className="text-sm font-semibold tabular-nums">{analytics.day30Retention?.rate || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(analytics.day30Retention?.rate || 0, 100)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="bg-emerald-500 rounded-full h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Subjects */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-border/40">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Popular Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {sessionMetrics.topSubjects.length > 0 ? (
                  sessionMetrics.topSubjects.slice(0, 5).map((s, i) => {
                    const maxSubject = Math.max(...sessionMetrics.topSubjects.map(x => x.count), 1);
                    return (
                      <div key={s.subject} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground/60 w-4 tabular-nums">{i + 1}.</span>
                            <span className="text-sm font-medium">{s.subject}</span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{s.count}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden ml-6">
                          <div
                            className="bg-primary/30 rounded-full h-1 transition-all"
                            style={{ width: `${(s.count / maxSubject) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No session data yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ───────── Platform Overview (Full Width) ───────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-card via-card to-muted/10">
          <CardHeader className="p-5 sm:p-8 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">Community Growth</CardTitle>
                <CardDescription className="text-sm mt-0.5">A snapshot of how Edyfra is growing.</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/users")}
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 text-xs"
            >
              All Users <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            {/* Telemetry Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
              {telemetry.length > 0 ? telemetry.map((t) => (
                <div key={t.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{t.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight tabular-nums">
                      {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                    </h4>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">{t.trend}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-4 flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading data…</p>
                </div>
              )}
            </div>

            {/* Bar Chart */}
            <div className="h-40 sm:h-48 flex items-end gap-2 sm:gap-3">
              {telemetry.length > 0 ? (
                telemetry.map((t, i) => {
                  const numVal = typeof t.value === "number" ? t.value : 0;
                  const h = maxTelemetry > 0 ? Math.max((numVal / maxTelemetry) * 100, 5) : 5;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.6 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                      className="flex-1 bg-primary/10 hover:bg-primary/25 rounded-md transition-colors cursor-default group relative"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-medium py-1 px-2.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border/40">
                        {t.label}: {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              )}
            </div>
            {telemetry.length > 0 && (
              <div className="flex gap-2 sm:gap-3 mt-2">
                {telemetry.map((t, i) => (
                  <p key={i} className="flex-1 text-[10px] text-muted-foreground font-medium truncate text-center">
                    {t.label}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
          <div className="border-t border-border/40 px-5 sm:px-8 py-3 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">
              Live data · Updated {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </Card>
      </motion.div>
      <SheetsImportModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
    </div>
  );
}
