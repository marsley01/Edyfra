"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Wallet, Clock, ArrowRight, Loader2, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { getTutorProfile, toggleTutorStatus, acceptMatchRequest } from "@/app/actions/tutor";
import { createClient } from "@/utils/supabase/client";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PendingRequest {
  id: string;
  subject: string;
  topic: string | null;
  createdAt: string | Date;
  studentId: string;
  studentName?: string;
}

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
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let channel: any;
    
    const setup = async () => {
      await loadProfile();
      await loadPendingRequests();

      // Subscribe to new requests - but only for subjects this tutor teaches
      const profile = await getTutorProfile();
      const tutorSubjects = profile?.subjects || [];

      channel = supabase
        .channel("live-requests")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "MatchRequest" },
          (payload: any) => {
            if (!payload.new?.sessionId) {
              // Only show if subject matches tutor's subjects (or show all if no subjects set)
              if (tutorSubjects.length === 0 || tutorSubjects.includes(payload.new?.subject)) {
                setPendingRequests((prev) => [payload.new as PendingRequest, ...prev]);
                toast.info(`New ${payload.new?.subject} request!`);
              }
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const loadProfile = async () => {
    const data = await getTutorProfile();
    if (data) {
      setProfile(data);
      setIsOnline((data.availability as Record<string, boolean>)?.isOnline || false);
    }
    setLoading(false);
  };

  const loadPendingRequests = async () => {
    setSessionLoading(true);
    
    // Fetch tutor's profile to filter by their subjects
    const tutorProfile = await getTutorProfile();
    const tutorSubjects = tutorProfile?.subjects || [];
    
    // Use server action for filtered queries instead of direct Supabase
    try {
      const { getFilteredMatchRequests } = await import("@/app/actions/match-algorithm");
      const data = await getFilteredMatchRequests(tutorSubjects);
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to load filtered requests:", err);
      // Fallback: show all (old behavior) if filter action fails
      const { data, error } = await supabase
        .from("MatchRequest")
        .select("*")
        .is("sessionId", null)
        .order("createdAt", { ascending: false })
        .limit(10);

      if (!error && data) {
        setPendingRequests(data as PendingRequest[]);
      }
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

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      const result = await acceptMatchRequest(id);
      if (result.success) {
        toast.success("Match accepted! Entering room...");
        router.push(`/study-room/${result.sessionId}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to accept.");
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: "Requests", value: pendingRequests.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Sessions", value: profile?.totalSessions || 0, icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Earnings", value: `KSH ${(profile?.totalSessions || 0) * (profile?.hourlyRate || 0)}`, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    { label: "Rating", value: profile?.rating ? profile.rating.toFixed(1) : "No ratings yet", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];
  const tutorName = profile?.user?.name?.split(" ")[0] || "Tutor";
  const taughtSubjects = (profile as any)?.subjects?.slice(0, 2).join(", ") || "your strongest subjects";

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans p-2">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Welcome back, {tutorName}.</h1>
          <p className="text-muted-foreground text-lg font-medium">You are set up to help with {taughtSubjects}. Go live when you are ready to take a student from stuck to clear.</p>
        </div>

        <div className={`flex items-center gap-6 px-8 py-5 rounded-[2rem] border-2 transition-all duration-500 shadow-xl ${isOnline ? "border-primary bg-primary/5 shadow-primary/5" : "border-border bg-secondary"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-muted-foreground"}`} />
            <div className="flex flex-col">
               <Label className="font-black text-[10px] uppercase tracking-widest leading-none">Status</Label>
               <span className="text-sm font-bold mt-1">{isOnline ? "Ready to Teach" : "Currently Offline"}</span>
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
        {/* Live Requests */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tightest">Live Requests</h2>
              <p className="text-muted-foreground font-medium">These are students asking for help in subjects you can teach.</p>
            </div>
            <Button onClick={loadPendingRequests} variant="ghost" className="rounded-full text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5">
              Refresh Feed
            </Button>
          </div>

          <div className="space-y-4">
            {sessionLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
                <BookOpen className="h-12 w-12 text-muted-foreground/20" />
               <div className="space-y-2">
                  <p className="text-xl font-black tracking-tightest">No students waiting right now.</p>
                  <p className="text-muted-foreground font-medium max-w-xs mx-auto">Stay online — a request will pop up as soon as someone needs your help.</p>
               </div>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <Card key={req.id} className="border-border/50 bg-secondary/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 rounded-[3rem] overflow-hidden group shadow-xl hover:shadow-primary/5">
                  <CardContent className="p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                      <div className="w-20 h-20 rounded-[2rem] bg-primary text-white flex items-center justify-center font-black text-2xl shadow-2xl shadow-primary/20 group-hover:rotate-6 transition-transform duration-500">
                        {req.subject[0]}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                            {req.subject}
                          </Badge>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Just initialized
                          </span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tightest group-hover:text-primary transition-colors">{req.topic || "General Subject Assistance"}</h3>
                        <div className="flex items-center gap-6">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Compensation</span>
                              <span className="text-sm font-black">KSH 500 / Session</span>
                           </div>
                           <div className="w-px h-8 bg-border" />
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Verification</span>
                              <span className="text-sm font-black flex items-center gap-1.5">
                                 <ShieldCheck className="h-3.5 w-3.5 text-primary" /> SECURE
                              </span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleAccept(req.id)}
                      disabled={acceptingId === req.id}
                      className="w-full lg:w-auto h-20 px-12 rounded-[1.8rem] font-black text-xs tracking-[0.2em] uppercase bg-foreground text-background hover:bg-primary hover:text-white shadow-2xl transition-all active:scale-95 group/btn"
                    >
                      {acceptingId === req.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Help This Student
                          <ArrowRight className="h-4 w-4 ml-3 group-hover/btn:translate-x-2 transition-transform" />
                        </>
                      )}
                    </Button>
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
                    <Clock className="h-6 w-6" /> Schedule
                 </h3>
                 <p className="text-primary-foreground/60 font-medium">Keep the times students can count on you clear.</p>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-6">
                 <div className="space-y-3">
                    {["Monday", "Wednesday", "Friday"].map(day => (
                      <div key={day} className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md">
                        <span className="font-bold text-sm">{day}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">2pm – 6pm</span>
                      </div>
                    ))}
                 </div>
                 <Button className="w-full h-14 rounded-2xl bg-white text-primary font-black text-xs tracking-widest uppercase hover:bg-white/90 shadow-xl">
                    Update Availability
                 </Button>
              </CardContent>
           </Card>

           <div className="p-8 rounded-[2.5rem] bg-secondary border border-border space-y-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                 <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold leading-relaxed">
                 Students usually need the most help after class and in the evening. Going live during those windows can make your tutor profile much more visible.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
