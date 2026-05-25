"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Wallet, Clock, ArrowRight, Loader2, BookOpen, Sparkles, ShieldCheck, Calendar as CalendarIcon, Video } from "lucide-react";
import { getTutorProfile, toggleTutorStatus, getTutorSessions } from "@/app/actions/tutor";
import { getUserData } from "@/app/actions/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AvatarPremium } from "@/components/ui/avatar-premium";

interface TutorProfile {
  totalSessions: number;
  hourlyRate: number;
  rating: number;
  user: { name: string };
  availability: any;
}

export default function TutorDashboard() {
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    loadProfile();
    loadBookings();
  }, []);

  const loadProfile = async () => {
    const data = await getTutorProfile();
    if (data) {
      setProfile(data);
      setIsOnline((data.availability as Record<string, boolean>)?.isOnline || false);
    }
    setLoading(false);
    return data;
  };

  const loadBookings = async () => {
    setSessionLoading(true);
    try {
      const pending = await getTutorSessions("PENDING");
      const active = await getTutorSessions("ACTIVE");
      setPendingSessions(pending);
      setActiveSessions(active);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    }
    setSessionLoading(false);
  };

  const handleStatusToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await toggleTutorStatus(checked);
      setIsOnline(checked);
      toast.success(checked ? "You're now live! Students can see you." : "You've gone offline.");
    } catch {
      toast.error("Couldn't update status.");
    } finally {
      setToggling(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    toast.success("Joining room...");
    router.push(`/study-room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: "Upcoming", value: pendingSessions.length, icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed", value: profile?.totalSessions || 0, icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Earnings", value: `KSH ${(profile?.totalSessions || 0) * (profile?.hourlyRate || 0)}`, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    { label: "Rating", value: profile?.rating ? profile.rating.toFixed(1) : "New", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];
  
  const tutorName = profile?.user?.name?.split(" ")[0] || "Tutor";

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans p-2">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Welcome back, {tutorName}.</h1>
          <p className="text-muted-foreground text-lg font-medium">Here is your upcoming teaching schedule.</p>
        </div>

        <div className={`flex items-center gap-6 px-8 py-5 rounded-[2rem] border-2 transition-all duration-500 shadow-xl ${isOnline ? "border-primary bg-primary/5 shadow-primary/5" : "border-border bg-secondary"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-muted-foreground"}`} />
            <div className="flex flex-col">
               <Label className="font-black text-[10px] uppercase tracking-widest leading-none">Status</Label>
                <span className="text-sm font-bold mt-1">{isOnline ? "Ready to Teach" : "Offline"}</span>
            </div>
          </div>
          <Switch checked={isOnline} onCheckedChange={handleStatusToggle} disabled={toggling} className="data-[state=checked]:bg-primary" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-secondary/30 backdrop-blur-sm rounded-[2rem] overflow-hidden hover:border-primary/50 transition-all group">
            <CardContent className="p-6 md:p-8 flex flex-col gap-4">
              <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-black tracking-tightest tabular-nums mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-12">
        {/* Schedule List */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tightest">Your Schedule</h2>
              <p className="text-muted-foreground font-medium">Upcoming booked sessions with students.</p>
            </div>
            <Button onClick={loadBookings} variant="ghost" className="rounded-full text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5">
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {sessionLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : [...activeSessions, ...pendingSessions].length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/20" />
               <div className="space-y-2">
                  <p className="text-xl font-black tracking-tightest">No upcoming sessions.</p>
                  <p className="text-muted-foreground font-medium max-w-xs mx-auto">Your schedule is clear. Students will book sessions based on your availability.</p>
               </div>
              </div>
            ) : (
              [...activeSessions, ...pendingSessions].map((session) => (
                <Card key={session.id} className="border-border/50 bg-secondary/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 rounded-[3rem] overflow-hidden group shadow-xl hover:shadow-primary/5">
                  <CardContent className="p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                      <AvatarPremium
                        seed={session.student.name}
                        src={session.student.avatar || ""}
                        size="lg"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black tracking-tightest">{session.student.name}</h3>
                          {session.status === "ACTIVE" && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full animate-pulse">
                              Active Now
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                            {session.subject}
                          </Badge>
                          {session.topic && (
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-background border border-border px-3 py-1 rounded-full">
                              Focus: {session.topic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                      <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session Status</span>
                        <span className="text-sm font-black text-foreground">{session.status === "ACTIVE" ? "In Progress" : "Upcoming"}</span>
                      </div>
                      <Button 
                        onClick={() => handleJoinRoom(session.roomId)}
                        className={`w-full sm:w-auto h-16 px-10 rounded-[1.8rem] font-black text-xs tracking-[0.2em] uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                          session.status === "ACTIVE" 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                            : "bg-primary hover:bg-primary/90 text-white"
                        }`}
                      >
                        <Video className="h-5 w-5" />
                        Join Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Schedule & Info */}
        <div className="space-y-8">
           <Card className="border-none bg-primary text-white rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20">
              <CardHeader className="p-10 pb-4">
                 <h3 className="text-2xl font-black tracking-tightest flex items-center gap-3">
                    <Clock className="h-6 w-6" /> Availability
                 </h3>
                 <p className="text-primary-foreground/80 font-medium text-sm leading-relaxed">
                   Set your bookable time slots so students know when you are free.
                 </p>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-6">
                 <div className="space-y-3">
                    {/* Placeholder for availability slots */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md">
                      <span className="font-bold text-sm">Mon - Fri</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">2pm – 6pm</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md">
                      <span className="font-bold text-sm">Saturday</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">9am – 1pm</span>
                    </div>
                 </div>
                 <Button onClick={() => router.push("/tutor/settings")} className="w-full h-14 rounded-2xl bg-white text-primary font-black text-xs tracking-widest uppercase hover:bg-white/90 shadow-xl">
                    Manage Slots
                 </Button>
              </CardContent>
           </Card>

           <div className="p-8 rounded-[2.5rem] bg-secondary border border-border space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold leading-relaxed">
                 Sessions are strictly monitored for quality. Be sure to join the room on time and focus on the student's listed weak areas for the best reviews.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
