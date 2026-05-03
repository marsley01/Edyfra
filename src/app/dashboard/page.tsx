"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        .or(`studentId.eq.${user.id},tutorId.eq.${user.id},peerId.eq.${user.id}`);
      
      setSessionCount(count || 0);
    }
  };

  const stats = [
    { label: "Total Points", value: userData?.points?.toLocaleString() || "0", icon: Trophy, color: "text-yellow-500" },
    { label: "Study Streak", value: `${userData?.streakDays || 0} Days`, icon: Flame, color: "text-orange-500" },
    { label: "Sessions", value: sessionCount.toString(), icon: BookOpen, color: "text-blue-500" },
    { label: "Academic Tier", value: userData?.tier || "BRONZE", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userData?.name?.split(" ")[0] || "Student"}! 👋</h1>
          <p className="text-muted-foreground text-lg italic">Ready to solve some problems today?</p>
        </div>
        <Link href="/dashboard/study">
          <Button className="gap-2 shadow-lg shadow-primary/20 py-6 px-8 text-lg rounded-xl">
            <Zap className="h-5 w-5 fill-current" />
            Match Me Now
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-2 hover:border-primary/30 transition-all cursor-default">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Track your latest study progress and interactions.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] flex flex-col items-center justify-center text-center p-12">
             <div className="bg-muted p-4 rounded-full mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground">No recent activity found. Start a session from the <Link href="/dashboard/study" className="text-primary hover:underline">Find Help</Link> page to see your progress here!</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-500/20 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Daily Challenge
              <Flame className="h-5 w-5 text-orange-500" />
            </CardTitle>
            <CardDescription>Earn bonus points every day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 bg-background rounded-lg border border-orange-500/10">
                <p className="text-sm font-medium leading-relaxed">Solve today&apos;s Mathematics challenge to keep your streak alive!</p>
             </div>
             <Link href="/dashboard/challenges" className="block w-full">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 gap-2">
                  Solve Now <ArrowRight className="h-4 w-4" />
                </Button>
             </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5 shadow-inner">
         <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="bg-primary/20 p-6 rounded-2xl">
               <Users className="h-12 w-12 text-primary" />
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
               <h3 className="text-2xl font-bold">Connect with Top Tutors</h3>
               <p className="text-muted-foreground text-lg">Don&apos;t struggle alone. Our verified experts are ready to help you master any subject.</p>
            </div>
            <Link href="/dashboard/tutors">
               <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 py-6 px-8 rounded-xl font-bold bg-background/50 backdrop-blur-sm">
                 Browse Tutors
               </Button>
            </Link>
         </CardContent>
      </Card>
    </div>
  );
}
