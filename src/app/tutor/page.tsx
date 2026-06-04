"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Wallet, Clock, ArrowRight, Loader2, BookOpen, Sparkles, ShieldCheck, Calendar as CalendarIcon, Video, Bell, UserPlus, Timer, Activity, Zap } from "lucide-react";
import { getTutorProfile, toggleTutorStatus, getTutorSessions, acceptMatchRequest } from "@/app/actions/tutor";
import { getUserData } from "@/app/actions/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { IncomingRequests } from "@/components/tutor/IncomingRequests";
import { getUpcomingBookings } from "@/app/actions/bookings";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface MatchRequest {
  id: string;
  subject: string;
  topic: string | null;
  createdAt: string | Date;
  studentId: string;
  student?: { name: string; avatar?: string | null };
}

interface TutorProfile {
  totalSessions: number;
  hourlyRate: number;
  rating: number;
  currentActiveSessions?: number;
  maxConcurrentSessions?: number;
  responseRate?: number;
  subjects?: string[];
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
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [searchingStudents, setSearchingStudents] = useState(0);
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [matchRequestsLoading, setMatchRequestsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [matchBanner, setMatchBanner] = useState<any>(null);
  const [countdown, setCountdown] = useState(120);
  const [showSound, setShowSound] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  // Listen for new match requests in real time
  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel("tutor-match-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "MatchRequest" },
        (payload: any) => {
          const req = payload.new;
          if (req?.subject && !req.sessionId) {
            setSearchingStudents(prev => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "MatchRequest" },
        (payload: any) => {
          if (payload.new?.sessionId) {
            setSearchingStudents(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Listen for broadcast matches
    const broadcastChannel = supabase
      .channel("global-matches")
      .on("broadcast", { event: "new-request" }, (payload: any) => {
        setSearchingStudents(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [isOnline, supabase]);

  // Listen for matches directed to this tutor
  useEffect(() => {
    if (!isOnline || !profile?.user?.name) return;

    const matchChannel = supabase
      .channel("tutor-matched")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "MatchRequest",
          filter: `sessionId=neq.null`,
        },
        async (payload: any) => {
          // Check if this match involves the current tutor
          if (payload.new?.sessionId) {
            const session = await (await import("@/app/actions/match")).getSession(payload.new.sessionId);
            if (session?.partnerId === profile?.user?.name || session?.partner?.name === profile?.user?.name) {
              // This tutor was matched
              const student = await (await import("@/app/actions/user")).getUserData();
              setMatchBanner({
                studentName: session?.student?.name || "A student",
                subject: payload.new.subject || "a subject",
                sessionId: payload.new.sessionId,
              });
              setCountdown(120);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(matchChannel); };
  }, [isOnline, profile, supabase]);

  // Countdown timer for match banner
  useEffect(() => {
    if (!matchBanner || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-reassign: tutor didn't respond in 2 minutes
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [matchBanner, countdown]);

  const handleTimeout = async () => {
    setMatchBanner(null);
    setCountdown(120);
    toast.error("Match timed out — student reassigned.");
  };

  const handleJoinMatch = (sessionId: string) => {
    setMatchBanner(null);
    router.push(`/study-room/${sessionId}`);
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
  }, []);

  // Polling fallback for "searching students" count
  // Realtime on MatchRequest can be disabled at the Supabase project level —
  // this 12s poll guarantees the counter never gets stuck at 0 even when it is.
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { getFilteredMatchRequests } = await import("@/app/actions/match-algorithm");
        const reqs = await getFilteredMatchRequests(
          (profile as any)?.subjects || []
        );
        if (cancelled) return;
        setSearchingStudents(reqs.length);
      } catch (e) {
        // silent — next tick will retry
      }
    };

    tick();
    const id = setInterval(tick, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOnline, profile]);

  // Fetch the actual match requests list (filtered by tutor's subjects).
  // Polled on the same cadence as the count above so the inline feed and the
  // pill stay in sync, and the tutor can accept directly from the dashboard.
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;

    const tick = async () => {
      try {
        setMatchRequestsLoading(true);
        const { getFilteredMatchRequests } = await import("@/app/actions/match-algorithm");
        const reqs = await getFilteredMatchRequests(
          (profile as any)?.subjects || []
        );
        if (cancelled) return;
        setMatchRequests((reqs as unknown as MatchRequest[]) || []);
      } catch (e) {
        // silent
      } finally {
        if (!cancelled) setMatchRequestsLoading(false);
      }
    };

    tick();
    const id = setInterval(tick, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOnline, profile]);

  const handleAcceptMatch = async (requestId: string) => {
    setAcceptingId(requestId);
    try {
      const result = await acceptMatchRequest(requestId);
      if (result?.success && result.sessionId) {
        toast.success("Match accepted! Entering room...");
        // Remove from local list
        setMatchRequests((prev) => prev.filter((r) => r.id !== requestId));
        setSearchingStudents((prev) => Math.max(0, prev - 1));
        router.push(`/study-room/${result.sessionId}`);
      } else {
        toast.error(result?.error || "Couldn't accept the request.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept the request.");
    } finally {
      setAcceptingId(null);
    }
  };

  const loadProfile = async () => {
    const data = await getTutorProfile();
    if (data) {
      setProfile(data as any);
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
      const bookings = await getUpcomingBookings();
      setPendingSessions(pending);
      setActiveSessions(active);
      setUpcomingBookings(bookings);
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

  const tutorName = profile?.user?.name?.split(" ")[0] || "Tutor";
  const responseRate = profile?.responseRate ?? 100;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans p-2">
      {/* Match Banner - Slides in when student is matched */}
      <AnimatePresence>
        {matchBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-emerald-500 text-white p-6 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-black">Student matched! {matchBanner.studentName} needs help with {matchBanner.subject}</p>
                  <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Join within {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")} or the student will be reassigned
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleJoinMatch(matchBanner.sessionId)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-black text-xs tracking-widest uppercase rounded-full h-14 px-10 shadow-xl animate-pulse"
              >
                <Video className="h-5 w-5 mr-2" /> Join Session
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Live Status Card - when online */}
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              You are online and visible to students
            </p>
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {searchingStudents > 0
              ? `${searchingStudents} student${searchingStudents > 1 ? 's are' : ' is'} searching for ${profile?.user?.name?.split(" ")[0] || "your subject"} right now. You will be notified the moment a student is matched to you.`
              : "No students are currently searching. Stay online — you'll be notified the moment a match is found."}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="h-3 w-3" />
            <span>Active sessions: {profile?.currentActiveSessions || 0}/{profile?.maxConcurrentSessions || 3}</span>
            <span className="mx-2">•</span>
            <span>Response rate: {responseRate}%</span>
          </div>
        </motion.div>
      )}

      {/* Inline Match Requests — instant-help feed right on the dashboard.
          Tutor can accept from here without navigating to /tutor/requests. */}
      {isOnline && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tightest flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Students looking for help
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Instant-match requests for your subjects. Accept and join a room.
              </p>
            </div>
            {matchRequests.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                {matchRequests.length} live
              </span>
            )}
          </div>

          {matchRequestsLoading && matchRequests.length === 0 ? (
            <div className="py-10 flex items-center justify-center bg-secondary/30 rounded-3xl border border-dashed border-border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : matchRequests.length === 0 ? (
            <div className="py-10 px-6 flex flex-col items-center justify-center text-center space-y-3 bg-secondary/30 rounded-3xl border border-dashed border-border">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-bold text-muted-foreground">
                No instant requests right now. We'll show them here the moment a student needs help.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchRequests.map((req) => (
                <Card
                  key={req.id}
                  className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background rounded-2xl overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-500/20 shrink-0">
                        {req.subject?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                            {req.subject}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            just now
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-black text-foreground truncate">
                          {req.topic || "General help"}
                        </h3>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAcceptMatch(req.id)}
                      disabled={acceptingId === req.id}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-amber-500/20 gap-2"
                    >
                      {acceptingId === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Video className="h-4 w-4" />
                          Accept & join room
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Active Sessions", value: profile?.currentActiveSessions || 0, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Completed", value: profile?.totalSessions || 0, icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Response Rate", value: `${responseRate}%`, icon: ShieldCheck, color: responseRate >= 60 ? "text-emerald-500" : "text-red-500", bg: responseRate >= 60 ? "bg-emerald-500/10" : "bg-red-500/10" },
          { label: "Rating", value: profile?.rating ? profile.rating.toFixed(1) : "New", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
        ].map((stat) => (
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
        <div className="xl:col-span-2 space-y-8">
          <IncomingRequests />

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
            ) : [...activeSessions, ...pendingSessions, ...upcomingBookings].length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/20" />
               <div className="space-y-2">
                  <p className="text-xl font-black tracking-tightest">No upcoming sessions.</p>
                  <p className="text-muted-foreground font-medium max-w-xs mx-auto">Your schedule is clear. Students will book sessions based on your availability.</p>
               </div>
              </div>
            ) : (
              <>
              {[...activeSessions, ...pendingSessions].map((session) => (
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
                        onClick={() => handleJoinRoom(session.id)}
                        className={`w-full sm:w-auto h-16 px-10 rounded-[1.8rem] font-black text-xs tracking-[0.2em] uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                          session.status === "ACTIVE" 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse" 
                            : "bg-primary hover:bg-primary/90 text-white"
                        }`}
                      >
                        <Video className="h-5 w-5" />
                        Join Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {upcomingBookings.map((booking) => {
                const now = new Date();
                const eatNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
                const sessionStart = new Date(booking.date);
                const [hours, minutes] = booking.startTime.split(":").map(Number);
                sessionStart.setHours(hours, minutes, 0, 0);
                const minutesUntilSession = (sessionStart.getTime() - eatNow.getTime()) / (1000 * 60);
                const canJoin = minutesUntilSession <= 5 && minutesUntilSession >= -30;

                return (
                  <Card key={booking.id} className="border-border/50 bg-secondary/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 rounded-[3rem] overflow-hidden group shadow-xl hover:shadow-primary/5">
                    <CardContent className="p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6 w-full lg:w-auto">
                        <AvatarPremium
                          seed={booking.student.name}
                          src={booking.student.avatar || ""}
                          size="lg"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black tracking-tightest">{booking.student.name}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                              {booking.subject}
                            </Badge>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-background border border-border px-3 py-1 rounded-full flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(booking.date).toLocaleDateString()} at {booking.startTime} EAT
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session Status</span>
                          <span className="text-sm font-black text-foreground">Confirmed</span>
                        </div>
                        <Button 
                          onClick={() => handleJoinRoom(booking.id)}
                          disabled={!canJoin}
                          className={`w-full sm:w-auto h-16 px-10 rounded-[1.8rem] font-black text-xs tracking-[0.2em] uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                            canJoin
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse"
                              : minutesUntilSession > 5
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white"
                          }`}
                        >
                          <Video className="h-5 w-5" />
                          {minutesUntilSession > 5 ? "Join in 5 min" : canJoin ? "Join Session" : "Expired"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </>
            )}
          </div>
        </div>

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
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md">
                      <span className="font-bold text-sm">Mon - Fri</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">2pm – 6pm EAT</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md">
                      <span className="font-bold text-sm">Saturday</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">9am – 1pm EAT</span>
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
