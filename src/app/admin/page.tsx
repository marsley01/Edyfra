"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, GraduationCap, MessageSquare, 
  TrendingUp, Award, Zap, AlertCircle, 
  ChevronRight, Clock, MapPin, Cpu, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AdminDashboard() {
  const stats = [
    { label: "Total Scholars", value: "2,540", icon: Users, trend: "+12%", color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Active Tutors", value: "128", icon: GraduationCap, trend: "+5%", color: "text-primary", bg: "bg-primary/10" },
    { label: "Live Sessions", value: "42", icon: MessageSquare, trend: "REAL-TIME", color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Global Streaks", value: "452", icon: Zap, trend: "+24%", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
               Command Overview
            </h1>
            <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase">Platform Status: Optimal</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 font-bold px-8 h-14">
               Audit Logs
            </Button>
            <Button className="rounded-2xl font-black gap-2 h-14 px-10 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90">
               Deploy Updates <TrendingUp className="h-4 w-4" />
            </Button>
         </div>
      </div>

      {/* Futuristic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden group hover:border-primary/20 transition-all duration-500">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className={`${stat.bg} p-4 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                   </div>
                   <Badge className="bg-white/5 text-white/60 border-white/10 font-black text-[9px] tracking-widest">{stat.trend}</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-4xl font-black mt-2 tracking-tighter">{stat.value}</h3>
                </div>
                <div className="pt-4 flex items-center gap-2">
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "70%" }}
                        className={`h-full ${stat.bg.replace('/10', '')}`}
                      />
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Verification Queue */}
        <Card className="lg:col-span-2 border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">System Queue</CardTitle>
              <CardDescription className="font-medium text-muted-foreground">Tutor verification & profile audits.</CardDescription>
            </div>
            <Link href="/admin/tutors">
              <Button variant="ghost" className="rounded-xl font-black text-xs tracking-widest gap-2 hover:bg-white/5">
                EXPAND LOGS <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-white/5">
                {[
                  { name: "Samuel Kamau", subject: "Mathematics", level: "University", date: "2h ago", status: "PENDING" },
                  { name: "Faith Njeri", subject: "Biology", level: "High School", date: "5h ago", status: "PENDING" },
                  { name: "David Mutua", subject: "Computer Science", level: "University", date: "1d ago", status: "REVIEWING" },
                ].map((tutor) => (
                  <div key={tutor.name} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-transparent flex items-center justify-center font-black border border-white/10 group-hover:border-primary/40 transition-colors">
                           {tutor.name[0]}
                        </div>
                        <div>
                           <p className="font-black text-lg">{tutor.name}</p>
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{tutor.subject} • {tutor.level}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-4">{tutor.date}</span>
                        <Badge variant="outline" className="border-white/10 text-[9px] font-black tracking-widest bg-white/5">{tutor.status}</Badge>
                        <Button className="rounded-xl font-black text-xs px-6 py-5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all">
                           AUDIT
                        </Button>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* Neural Monitoring */}
        <Card className="border-white/5 bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border-2 border-primary/5 relative">
          <div className="absolute top-0 right-0 p-8">
             <Cpu className="h-8 w-8 text-primary/20" />
          </div>
          <CardHeader className="p-10">
            <CardTitle className="text-2xl font-black">Core Vitals</CardTitle>
            <CardDescription className="text-muted-foreground">Real-time resource allocation.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 space-y-8 pb-10">
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
                   <span className="text-muted-foreground">Neural Gateway (AI)</span>
                   <span className="text-green-400">98% Efficient</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "98%" }}
                     className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                   />
                </div>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
                   <span className="text-muted-foreground">Database Cluster</span>
                   <span className="text-primary">Latency: 12ms</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "24%" }}
                     className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                   />
                </div>
             </div>
             <div className="pt-10 border-t border-white/5 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                   <span className="text-xs font-bold uppercase tracking-widest">Postgres Sync: OK</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 bg-green-500 rounded-full" />
                   <span className="text-xs font-bold uppercase tracking-widest">Socket Matchmaking: LIVE</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 bg-green-500 rounded-full" />
                   <span className="text-xs font-bold uppercase tracking-widest">Tutor Discovery: IDLE</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
