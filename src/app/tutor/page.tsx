"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Users, Star, Wallet, 
  Clock, ChevronRight,
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { getTutorProfile, toggleTutorStatus } from "@/app/actions/tutor";
import { toast } from "sonner";

interface TutorProfileData {
  user: { name: string };
  totalSessions: number;
  hourlyRate: number;
  rating: string | number;
  availability: { isOnline?: boolean };
}

export default function TutorDashboard() {
  const [profile, setProfile] = useState<TutorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getTutorProfile();
    if (data) {
      setProfile(data as any);
      setIsOnline((data.availability as any)?.isOnline || false);
    }
    setLoading(false);
  };

  const handleStatusToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await toggleTutorStatus(checked);
      setIsOnline(checked);
      toast.success(checked ? "You are now LIVE. Students can discover you!" : "You are now OFFLINE.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const stats = [
    { label: "Active Requests", value: "3", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed Sessions", value: profile?.totalSessions || "0", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Total Earnings", value: `Ksh ${profile?.totalSessions * profile?.hourlyRate || 0}`, icon: Wallet, color: "text-teal-600", bg: "bg-teal-600/10" },
    { label: "Student Rating", value: profile?.rating || "New", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Tutor Command Center</h1>
          <p className="text-muted-foreground font-medium">Welcome back, Expert {profile?.user?.name.split(" ")[0]}.</p>
        </div>
        
        <div className={`flex items-center gap-6 px-6 py-4 rounded-2xl border-2 transition-all ${isOnline ? "border-teal-500 bg-teal-500/5" : "border-slate-200 bg-slate-50"}`}>
           <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-teal-500 animate-pulse" : "bg-slate-400"}`} />
              <Label className="font-black text-xs uppercase tracking-widest">{isOnline ? "Discovery Active" : "Discovery Paused"}</Label>
           </div>
           <Switch 
             checked={isOnline} 
             onCheckedChange={handleStatusToggle} 
             disabled={toggling}
             className="data-[state=checked]:bg-teal-600"
           />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`${stat.bg} p-4 rounded-2xl`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-black">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Match Requests */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem]">
          <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
             <div>
                <CardTitle className="text-xl font-black">Live Match Requests</CardTitle>
                <CardDescription>Students currently seeking help in your subjects.</CardDescription>
             </div>
             <Button variant="outline" className="rounded-xl font-bold h-10 border-teal-600/20 text-teal-600 hover:bg-teal-600/5">
                Refresh Feed
             </Button>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { student: "Mercy W.", subject: "Physics", topic: "Newton&apos;s Laws", time: "Just now" },
                  { student: "Kelvin O.", subject: "Mathematics", topic: "Calculus I", time: "4m ago" },
                ].map((req) => (
                  <div key={req.student} className="p-6 flex items-center justify-between hover:bg-teal-50/30 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center font-black">
                           {req.student[0]}
                        </div>
                        <div>
                           <p className="font-bold">{req.student}</p>
                           <p className="text-xs text-muted-foreground font-medium">{req.subject} • <span className="text-teal-600">{req.topic}</span></p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{req.time}</span>
                        <Button className="rounded-xl font-black text-xs bg-teal-600 hover:bg-teal-700 px-6">Accept</Button>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
          <CardFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-center border-t border-slate-100 dark:border-slate-800">
             <Button variant="ghost" className="text-xs font-bold gap-2 text-muted-foreground">
                View History <ChevronRight className="h-4 w-4" />
             </Button>
          </CardFooter>
        </Card>

        {/* Availability Schedule */}
        <Card className="border-none shadow-sm rounded-[2rem] bg-teal-600 text-white">
           <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                 <Clock className="h-5 w-5" /> Your Schedule
              </CardTitle>
              <CardDescription className="text-teal-100">Set your recurring active hours.</CardDescription>
           </CardHeader>
           <CardContent className="p-8 pt-4 space-y-4">
              <div className="space-y-3">
                 {["Mon", "Wed", "Fri"].map(day => (
                    <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/5">
                       <span className="font-bold text-sm">{day}</span>
                       <span className="text-xs font-medium">02:00 PM - 06:00 PM</span>
                    </div>
                 ))}
              </div>
              <Button className="w-full mt-4 rounded-xl bg-white text-teal-600 font-black py-6 hover:bg-white/90">
                 Edit Weekly Schedule
              </Button>
              <div className="pt-4 flex items-center gap-2 text-[10px] font-bold text-teal-100 uppercase tracking-widest leading-relaxed">
                 <AlertCircle className="h-3 w-3" />
                 Students can book sessions during these times even when you&apos;re offline.
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
