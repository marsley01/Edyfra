"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, BookOpen, Flame, Trophy, TrendingUp, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getUserData } from "@/app/actions/user";
import { createClient } from "@/utils/supabase/client";

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const user = await getUserData();
    setUserData(user);
    
    if (user) {
      const { count } = await supabase
        .from("Session")
        .select("*", { count: "exact", head: true })
        .or(`studentId.eq.${user.id},partnerId.eq.${user.id}`);
      
      setSessionCount(count || 0);
    }
  };

  const stats = [
    { label: "Points", value: userData?.points?.toLocaleString() || "0", icon: Trophy },
    { label: "Streak", value: `${userData?.streakDays || 0} Days`, icon: Flame },
    { label: "Sessions", value: sessionCount.toString(), icon: BookOpen },
    { label: "Tier", value: userData?.tier || "BRONZE", icon: TrendingUp },
  ];

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000 font-sans">
      {/* Personalized Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-border">
        <div className="space-y-4">
           <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-none">
             Welcome back, <br />
             <span className="text-primary">{userData?.name?.split(" ")[0] || "Scholar"}.</span>
           </h1>
           <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
             Ready to synchronize your academic potential today? Your mission-critical workspace is active.
           </p>
        </div>
        <Link href="/dashboard/study">
          <Button className="bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest px-12 h-16 rounded-full uppercase shadow-2xl transition-all active:scale-95 gap-3">
            <Zap className="h-4 w-4 fill-current text-primary" />
            Initialize Protocol
          </Button>
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-8 bg-secondary rounded-[2.5rem] border border-border/50 space-y-6 group hover:bg-background hover:shadow-2xl hover:translate-y-[-4px] transition-all">
             <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm border border-border group-hover:bg-primary group-hover:text-white transition-colors">
                   <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</span>
             </div>
             <div className="text-3xl font-black tracking-tightest tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Log */}
        <div className="lg:col-span-2 p-10 md:p-16 rounded-[3rem] bg-secondary border border-border/50 space-y-8 relative overflow-hidden group">
           <div className="relative z-10 space-y-2">
              <h3 className="text-3xl font-black tracking-tightest">Institutional Log</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Recent Activity & Progress Synchronization</p>
           </div>
           <div className="relative z-10 min-h-[300px] flex flex-col items-center justify-center text-center p-12 space-y-6 bg-background rounded-[2rem] border border-border/50">
              <div className="bg-secondary p-6 rounded-[2rem] shadow-sm">
                 <BookOpen className="h-12 w-12 text-muted-foreground/20" />
              </div>
              <p className="text-muted-foreground font-medium text-lg max-w-sm">
                No active session logs detected. Begin a matching protocol to populate your trajectory data.
              </p>
           </div>
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
        </div>

        {/* Daily Quest */}
        <div className="p-10 rounded-[3rem] bg-black text-white space-y-10 relative overflow-hidden group shadow-2xl">
           <div className="relative z-10 space-y-2">
              <h3 className="text-3xl font-black tracking-tightest flex items-center gap-3">
                Daily Quest
                <Flame className="h-8 w-8 text-primary animate-pulse" />
              </h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Scholar Incentive Protocol</p>
           </div>
           <div className="relative z-10 p-8 bg-white/5 rounded-[2rem] border border-white/10 space-y-8">
              <p className="text-lg font-medium leading-relaxed opacity-80">
                Synchronize with the advanced Calculus challenge to maintain your institutional streak and earn +50 PTS.
              </p>
              <Link href="/dashboard/challenges" className="block w-full">
                <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase rounded-full shadow-2xl transition-all active:scale-95">
                  Execute Quest <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
           </div>
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2" />
        </div>
      </div>

      {/* Expert Network Highlight */}
      <div className="p-10 md:p-16 rounded-[3rem] bg-background border border-border shadow-sm flex flex-col md:flex-row items-center gap-12 group hover:shadow-2xl transition-all duration-700">
         <div className="w-24 h-24 rounded-[2rem] bg-secondary flex items-center justify-center text-primary shadow-sm border border-border group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <Users className="h-10 w-10" />
         </div>
         <div className="flex-1 space-y-4 text-center md:text-left">
            <h3 className="text-3xl md:text-4xl font-black tracking-tightest leading-tight">Verified Expert Network.</h3>
            <p className="text-muted-foreground font-medium text-lg md:text-xl">
               Synchronize with top-tier tutors for mission-critical academic assistance and trajectory correction.
            </p>
         </div>
         <Link href="/dashboard/tutors" className="w-full md:w-auto">
            <Button className="w-full md:w-auto h-16 px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl hover:bg-foreground/90 transition-all active:scale-95">
              Browse Network
            </Button>
         </Link>
      </div>
    </div>
  );
}
