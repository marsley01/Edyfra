"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, MessageSquare, TrendingUp, Zap, Cpu, ShieldCheck, Activity, Database, Clock, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


const ICONS = [Users, GraduationCap, MessageSquare, Zap];
const COLORS = ["text-blue-400", "text-primary", "text-purple-400", "text-orange-400"];
const BGS = ["bg-blue-500/10", "bg-primary/10", "bg-purple-500/10", "bg-orange-500/10"];

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
}: {
  stats: Stat[];
  telemetry: any[];
  pendingApplications: any[];
  recentUsers: any[];
  systemLoad: number;
  completedSessions: number;
}) {
  const router = useRouter();

  const healthChecks = [
    { 
      label: "Database", 
      status: stats[0]?.value !== undefined ? "Connected" : "Checking...", 
      color: stats[0]?.value !== undefined ? "bg-emerald-500" : "bg-yellow-500",
      detail: `${stats[0]?.value || 0} registered users`,
      pct: stats[0]?.value !== undefined ? 100 : 0
    },
    { 
      label: "Active sessions", 
      status: stats[2]?.value > 0 ? `${stats[2].value} happening now` : "None right now", 
      color: stats[2]?.value > 0 ? "bg-primary" : "bg-muted-foreground",
      detail: `${completedSessions || 0} completed so far`,
      pct: stats[2]?.value > 0 ? Math.min((stats[2].value / Math.max(stats[0]?.value || 1, 1)) * 100, 100) : 0
    },
    { 
      label: "Tutor applications", 
      status: pendingApplications.length > 0 ? `${pendingApplications.length} pending` : "Nothing pending", 
      color: pendingApplications.length > 0 ? "bg-amber-500" : "bg-emerald-500",
      detail: pendingApplications.length > 0 ? "Needs your attention" : "Everything is up to date",
      pct: pendingApplications.length > 0 ? Math.min(pendingApplications.length * 10, 100) : 0
    },
  ];

  const maxTelemetry = telemetry.length > 0 
    ? Math.max(...telemetry.map((t) => typeof t.value === "number" ? t.value : 0), 1)
    : 1;

  return (
    <div className="space-y-10 pb-20">
      {/* Top Status Bar — Real data only */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-slate-900 border border-white/5 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl overflow-hidden">
         <div className="flex items-center gap-2 px-2 sm:px-4 border-r border-white/10 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full animate-pulse ${stats[0]?.value !== undefined ? "bg-emerald-500" : "bg-yellow-500"}`} />
            <span className={stats[0]?.value !== undefined ? "text-emerald-500" : "text-yellow-500"}>
              {stats[0]?.value !== undefined ? "Operational" : "Initializing"}
            </span>
         </div>
         <div className="flex items-center gap-2 px-2 sm:px-4 border-r border-white/10 text-muted-foreground/60 flex-shrink-0">
            <Zap className="h-3 w-3" />
            <span>Load: {systemLoad}%</span>
         </div>
         <div className="flex items-center gap-2 px-2 sm:px-4 border-r border-white/10 text-muted-foreground/60 hidden sm:flex">
            <Database className="h-3 w-3" />
            <span>{stats[0]?.value || 0} Users</span>
         </div>
         <div className="flex items-center gap-2 px-2 sm:px-4 text-muted-foreground/60 hidden md:flex">
            <Activity className="h-3 w-3" />
            <span>{stats[2]?.value || 0} Active</span>
         </div>
         <div className="flex-1" />
         <div className="text-primary pr-2 sm:pr-4 flex-shrink-0">Edyfra Admin</div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Platform Overview</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-bold tracking-widest uppercase">Here&apos;s how everything is running</p>
        </div>
        <div className="flex gap-3 sm:gap-4">
           <Button onClick={() => { router.push("/admin/sessions"); }} className="rounded-2xl font-bold px-4 sm:px-8 h-12 sm:h-14 text-xs border-border hover:bg-secondary bg-secondary">
             <Activity className="h-4 w-4 mr-2" /> Active Sessions
           </Button>
           <Button onClick={() => router.refresh()} className="rounded-2xl font-black px-4 sm:px-8 h-12 sm:h-14 text-xs bg-primary text-white shadow-xl shadow-primary/20">
              <Clock className="h-4 w-4 mr-2" /> Refresh
           </Button>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = ICONS[i];
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 bg-secondary/30 backdrop-blur-xl">
                <CardContent className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`${BGS[i]} p-3 sm:p-4 rounded-2xl group-hover:rotate-12 transition-transform`}>
                      <Icon className={`h-5 sm:h-6 w-5 sm:w-6 ${COLORS[i]}`} />
                    </div>
                    <Badge variant="outline" className="font-black text-[8px] sm:text-[9px] tracking-widest border-border opacity-50 hidden sm:inline-flex">{stat.trend}</Badge>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
                    <h3 className="text-3xl sm:text-5xl font-black mt-1 sm:mt-2 tracking-tighter tabular-nums">{stat.value.toLocaleString()}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tutor Application Queue */}
        <Card className="lg:col-span-2 rounded-[3rem] overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="p-6 sm:p-10 border-b flex flex-row items-center justify-between bg-secondary/10">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black tracking-tight">Tutor Applications</CardTitle>
              <CardDescription className="font-medium text-muted-foreground text-xs sm:text-sm">People waiting to join as tutors.</CardDescription>
            </div>
            <Link href="/admin/tutors">
               <Button variant="ghost" className="rounded-xl font-bold text-xs uppercase tracking-widest">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pendingApplications.length === 0 ? (
              <div className="p-12 sm:p-20 text-center space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                   <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-500/40" />
                </div>
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">All caught up</p>
                <p className="text-muted-foreground/60 text-sm font-medium">No one is waiting for approval right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="p-6 sm:p-8 flex items-center justify-between hover:bg-secondary/40 transition-colors group">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <AvatarPremium seed={app.user?.name || app.id} size="md" />
                      <div className="min-w-0">
                        <p className="font-black text-sm sm:text-xl truncate">{app.user?.name || "Expert Candidate"}</p>
                        <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          {app.subjects?.join(", ") || "General Expertise"}
                        </p>
                      </div>
                    </div>
                    <Link href="/admin/tutors">
                      <Button className="rounded-2xl font-black text-[10px] tracking-widest uppercase h-10 sm:h-12 px-4 sm:px-6 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5">
                        Verify
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health — Real data from DB queries */}
        <Card className="rounded-[3rem] overflow-hidden bg-slate-900 border-white/5 text-white">
          <CardHeader className="p-6 sm:p-10">
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
               <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Platform Health
            </CardTitle>
            <CardDescription className="text-white/40 text-xs sm:text-sm">What&apos;s happening right now.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-10 space-y-6 sm:space-y-10 pb-6 sm:pb-12">
             {healthChecks.map(v => (
               <div key={v.label} className="space-y-3 sm:space-y-4">
                 <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
                   <span className="text-white/40">{v.label}</span>
                   <span className={v.color === "bg-emerald-500" ? "text-emerald-400" : v.color === "bg-amber-500" ? "text-amber-400" : "text-muted-foreground"}>{v.status}</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: `${v.pct}%` }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className={`h-full ${v.color}`}
                   />
                 </div>
                 <p className="text-[8px] sm:text-[9px] text-white/20">{v.detail}</p>
               </div>
             ))}
             
            <div className="pt-6 sm:pt-10 border-t border-white/5 space-y-4 sm:space-y-6">
               <p className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Recently Joined</p>
               {recentUsers.length > 0 ? (
                 <div className="space-y-3 sm:space-y-4">
                    {recentUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-3 min-w-0">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            <span className="font-bold text-white/80 truncate">{u.name}</span>
                         </div>
                         <Badge className="bg-white/5 border-none text-[8px] font-black uppercase text-white/40 ml-2 flex-shrink-0">{u.role}</Badge>
                      </div>
                    ))}
                 </div>
               ) : (
                 <p className="text-white/20 text-xs text-center py-4">No users registered yet</p>
               )}
            </div>
          </CardContent>
        </Card>

       {/* Ecosystem Telemetry — Real data only */}
       <Card className="lg:col-span-3 rounded-[3rem] bg-slate-900 border-white/10 overflow-hidden relative shadow-3xl">
         <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="p-6 sm:p-12 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                   <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-3xl font-black text-white tracking-tighter">Platform Numbers</CardTitle>
                  <CardDescription className="text-white/40 font-medium text-sm sm:text-lg">Where things stand right now.</CardDescription>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                 <Button onClick={() => { router.push("/admin/users"); }} variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-widest h-12 sm:h-14 px-4 sm:px-8 hover:bg-white/10">
                    See All Users
                 </Button>
              </div>
            </CardHeader>
           
            <CardContent className="p-6 sm:p-12 relative z-10">
               {/* Telemetry Numbers */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-16 mb-8 sm:mb-16">
                  {telemetry.length > 0 ? telemetry.map((t, i) => (
                    <div key={t.label} className="space-y-2 sm:space-y-4">
                         <p className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t.label}</p>
                         <div className="flex items-baseline gap-2 sm:gap-3">
                            <h4 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter tabular-nums">
                               {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                            </h4>
                            <span className="text-emerald-400 font-black text-[9px] sm:text-xs">{t.trend}</span>
                         </div>
                    </div>
                  )) : (
                    <div className="col-span-4 flex items-center justify-center py-12">
                      <p className="text-white/20 text-xs font-black uppercase tracking-widest">Telemetry data loading...</p>
                    </div>
                  )}
               </div>

               {/* Bar Chart — proportional to actual data */}
               <div className="h-48 flex items-end gap-3 sm:gap-4 px-2">
                  {telemetry.length > 0 ? (
                    telemetry.map((t, i) => {
                         const numVal = typeof t.value === "number" ? t.value : 0;
                         const h = maxTelemetry > 0 ? Math.max((numVal / maxTelemetry) * 100, 5) : 5;
                         return (
                          <motion.div 
                             key={i}
                             initial={{ height: 0 }}
                             animate={{ height: `${h}%` }}
                             transition={{ delay: i * 0.1, duration: 0.8 }}
                             className="flex-1 bg-gradient-to-t from-primary/50 to-primary/10 rounded-t-lg hover:from-primary hover:to-primary/50 transition-all cursor-crosshair group relative"
                          >
                             <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {t.label}: {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                             </div>
                          </motion.div>
                       );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <p className="text-white/20 text-xs font-black uppercase tracking-widest">No data available</p>
                    </div>
                  )}
               </div>
               {telemetry.length > 0 && (
                 <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4 px-2">
                   {telemetry.map((t, i) => (
                     <p key={i} className="flex-1 text-[7px] sm:text-[9px] font-black text-white/20 uppercase tracking-wider truncate text-center">
                       {t.label}
                     </p>
                   ))}
                 </div>
               )}
           </CardContent>
            <div className="bg-white/5 p-4 sm:p-6 text-center">
               <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Live data &bull; Updated {new Date().toLocaleTimeString()}</p>
            </div>
          </Card>
        </div>


      </div>
    );
}
