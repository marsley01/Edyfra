"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Zap, BookOpen, Users, ArrowRight, GraduationCap, Clock, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSafeUserData, useSessionCounter } from "@/hooks/useAntigravityFixes";
import { DashboardLoadingState, DashboardError } from "@/hooks/useAntigravityFixes";
import { applyToBecomeTutor } from "@/app/actions/admin-tutor";
import { showError, showSuccess } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";
import LevelXPBar from "@/components/dashboard/LevelXPBar";
import { getTimeGreeting } from "@/lib/greeting";

const DailyChallengeCard = dynamic(
  () => import("@/components/dashboard/DailyChallengeCard"),
  {
    loading: () => (
      <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-foreground text-background space-y-6 sm:space-y-10 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface RecentSession {
  id: string;
  subject: string;
  topic: string | null;
  status: string;
  createdAt: string;
  partner?: { name: string } | null;
  tier: string;
}

interface UpcomingBooking {
  id: string;
  subject: string;
  topic: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: string;
  tutor: { name: string, avatar: string | null };
}

export default function DashboardPageContent() {
  const { userData, loading: userDataLoading, error: userDataError, retryCount, setRetryCount } = useSafeUserData();
  const { sessionCount, loading: sessionsLoading } = useSessionCounter(userData?.id || '');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [appStatus, setAppStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');
  const [appLoading, setAppLoading] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  useEffect(() => {
    if (!userData?.id) return;
    const load = async () => {
      try {
        const [
          { getUserSessions },
          { getUpcomingStudentBookings },
          { hasCompletedChallengeToday }
        ] = await Promise.all([
          import("@/app/actions/match"),
          import("@/app/actions/bookings"),
          import("@/app/actions/user"),
        ]);
        const [sessions, bookings, challengeDone] = await Promise.all([
          getUserSessions(userData.id),
          getUpcomingStudentBookings(),
          hasCompletedChallengeToday(userData.id),
        ]);
        setRecentSessions(sessions.slice(0, 5).map(s => ({
          ...s,
          createdAt: s.startedAt?.toISOString() || new Date().toISOString(),
          topic: s.topic || null
        })));
        setUpcomingBookings(bookings as any[]);
        setChallengeCompleted(challengeDone);
       } catch (err) {
         console.error("Failed to load recent sessions:", err);
       } finally {
         setLoadingRecent(false);
       }
    };
    load();
  }, [userData?.id]);

  useEffect(() => {
    if (!userData?.id || userData?.role === 'TUTOR' || userData?.role === 'ADMIN') return;
    const checkAppStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const status = user?.user_metadata?.tutorApplicationStatus;
        if (status) {
          setAppStatus(status as any);
        }
      } catch (err) {
        console.error("Failed to check tutor application status:", err);
      }
    };
    checkAppStatus();
  }, [userData?.id, userData?.role]);

  const handleApplyTutor = async () => {
    setAppLoading(true);
    try {
      const result = await applyToBecomeTutor({
        subjects: userData?.studentProfile?.subjects || [],
      });
      if (result.success) {
        setAppStatus('PENDING');
        showSuccess("Application submitted", { description: "We'll review it and get back to you." });
      } else {
        showError({
          title: "We couldn't submit your application",
          cause: result.error || "The application didn't go through.",
          fix: "Please try again.",
        });
      }
    } catch (err: any) {
      showError({
        title: "We couldn't submit your application",
        cause: err.message || "The application didn't go through.",
        fix: "Please try again.",
      });
    } finally {
      setAppLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (userDataError) {
    return (
      <DashboardError error={userDataError} onRetry={handleRetry} />
    );
  }

  if (userDataLoading || sessionsLoading) {
    return (
      <DashboardLoadingState />
    );
  }

  if (!userData) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Unable to load dashboard data. Please try again.</p>
        <button onClick={handleRetry} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const firstName = userData?.name?.split(" ")[0] || "there";
  
  const hour = new Date().getHours();
  const greetingText = 
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
    'Studying late';

  const emoji = 
    hour < 12 ? '☀️' :
    hour < 17 ? '👋' :
    hour < 21 ? '🌙' : '💪';

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const sessionToday = upcomingBookings.find(b => isToday(b.date));

  let subtext = "";
  if (sessionToday) {
    subtext = `You have a session with ${sessionToday.tutor.name} at ${sessionToday.startTime}`;
  } else if (challengeCompleted) {
    subtext = "Great — challenge done for today";
  } else {
    const lastActive = userData?.lastActiveAt ? new Date(userData.lastActiveAt) : null;
    const isInactive3Days = lastActive && (Date.now() - lastActive.getTime() > 3 * 24 * 60 * 60 * 1000);
    if (isInactive3Days) {
      subtext = "Welcome back — your subjects are waiting for you";
    } else {
      const topSubject = userData?.studentProfile?.subjects?.[0] || "your subjects";
      subtext = `Ready to study ${topSubject}?`;
    }
  }

  const subjectFocus = userData?.studentProfile?.subjects?.[0] || userData?.tutorProfile?.subjects?.[0] || "your subject";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-1000 font-sans">
      {/* Personalized Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 md:pb-8 border-b border-border">
         <div className="space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tightest leading-none">
              <span className="text-primary">{greetingText}, {firstName}</span> {emoji}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium max-w-xl">
              {subtext}
            </p>
         </div>
         <Link href="/dashboard/study" className="shrink-0">
           <Button className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest px-8 h-12 sm:h-14 rounded-full uppercase shadow-xl transition-all active:scale-95 gap-3">
             <Zap className="h-4 w-4 fill-current text-primary" />
             Start Session
           </Button>
         </Link>
      </div>

      {/* Level & XP Progress Bar */}
      <LevelXPBar points={userData?.points || 0} streakDays={userData?.streakDays || 0} />

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Activity Log */}
        <div className="lg:col-span-2 p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl bg-secondary border border-border/50 space-y-4 sm:space-y-6 relative overflow-hidden">
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">Your Activity</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{recentSessions.length > 0 ? `${recentSessions.length} recent sessions` : "Your recent activity will show up here"}</p>
           </div>
           {loadingRecent ? (
             <div className="relative z-10 min-h-[140px] flex items-center justify-center">
               <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
             </div>
           ) : (recentSessions.length > 0 || upcomingBookings.length > 0) ? (
             <div className="relative z-10 space-y-2.5">
               {upcomingBookings.length > 0 && (
                 <div className="space-y-2 mb-4">
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">Upcoming Bookings</h4>
                   {upcomingBookings.map((booking) => (
                     <div key={booking.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 transition-all">
                       <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-base sm:text-lg shadow-lg shadow-primary/20 shrink-0">
                         {booking.subject[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-bold text-sm truncate">{booking.topic || booking.subject}</p>
                         <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                           With {booking.tutor.name} · {new Date(booking.date).toLocaleDateString()} {booking.startTime}
                         </p>
                       </div>
                       <div className="flex flex-col items-end gap-1.5 shrink-0">
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                           {booking.status}
                         </span>
                         {booking.status === 'confirmed' && (
                           <Button onClick={() => window.location.href = `/study-room/${booking.id}`} className="bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full h-7 px-3">
                             Join
                           </Button>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
               
               {recentSessions.length > 0 && <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground pt-1">Past Sessions</h4>}
               {recentSessions.map((session) => (
                 <Link href={`/study-room/${session.id}`} key={session.id} className="block">
                   <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all active:scale-[0.99]">
                     <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-base shrink-0">
                       {session.subject[0]}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-sm truncate">{session.topic || session.subject}</p>
                       <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                         {session.partner?.name ? (session.tier === "TUTOR" ? "Tutor" : "Peer") : "Mash AI"} · {new Date(session.createdAt).toLocaleDateString()}
                       </p>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-secondary shrink-0">
                       {session.status}
                     </span>
                   </div>
                 </Link>
               ))}
               <Link href="/dashboard/sessions" className="block text-center pt-2">
                 <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary h-10">
                   View All Sessions →
                 </Button>
               </Link>
             </div>
           ) : (
             <div className="relative z-10 min-h-[160px] flex flex-col items-center justify-center text-center p-6 space-y-3 bg-background rounded-2xl border border-border/50">
                <div className="bg-secondary p-4 rounded-2xl">
                   <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                </div>
              <p className="text-muted-foreground font-medium text-sm max-w-xs">
                   No sessions yet. Start your first study session and your activity will show up here.
                </p>
             </div>
           )}
           <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full" />
        </div>

        {/* Daily Challenge Card — lazy loaded */}
        <DailyChallengeCard
          userId={userData.id}
          educationLevel={userData.educationLevel as string}
        />
      </div>

       {/* Referral Card */}
       <div className="p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group hover:shadow-xl transition-all duration-500">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 flex-shrink-0">
             <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Refer a Friend</p>
             <h2 className="text-lg sm:text-xl font-black tracking-tight">
               Your code: <span className="text-purple-500">{userData?.referralCode || "------"}</span>
             </h2>
             <p className="text-muted-foreground text-sm">
                Friends get 50 XP · You get 100 XP on their first session.
             </p>
          </div>
          <button
            onClick={async () => {
              const code = userData?.referralCode;
              if (!code) return;
              try {
                await navigator.clipboard.writeText(code);
              } catch {
                const textarea = document.createElement("textarea");
                textarea.value = code;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
              }
              showSuccess("Referral code copied!", { description: "Share it with a friend to earn XP." });
            }}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-purple-500 text-white font-black text-xs tracking-widest uppercase shadow-lg hover:bg-purple-600 transition-all active:scale-95 shrink-0"
          >
            Copy Code
          </button>
       </div>

       {/* Expert Network Highlight */}
       <div className="p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl bg-background border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group hover:shadow-xl transition-all duration-500">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary border border-border group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex-shrink-0">
             <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-primary">Find a Mentor</p>
             <h2 className="text-lg sm:text-xl font-black tracking-tight">
               Get help when you hit a wall.
             </h2>
             <p className="text-muted-foreground text-sm">
               Find a tutor who can explain {subjectFocus} in a way that clicks.
             </p>
          </div>
          <Link href="/dashboard/tutors" className="w-full sm:w-auto shrink-0">
             <Button className="w-full sm:w-auto h-11 px-6 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-lg hover:bg-foreground/90 transition-all active:scale-95">
               Find Tutor
             </Button>
          </Link>
       </div>

       {/* Tutor Application Section */}
       {userData?.role === 'STUDENT' && (
         <div className="p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group hover:shadow-xl transition-all duration-500">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex-shrink-0">
               <GraduationCap className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Earn while helping</p>
               <h2 className="text-lg sm:text-xl font-black tracking-tight">
                 Become a <span className="text-primary">Tutor.</span>
               </h2>
               <p className="text-muted-foreground text-sm">
                   Good at {subjectFocus}? Turn your knowledge into impact and income.
               </p>
            </div>
            <div className="w-full sm:w-auto shrink-0">
              {appStatus === 'PENDING' ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-xs uppercase tracking-widest text-yellow-500">Pending Review</p>
                     <p className="text-[10px] text-muted-foreground">You&apos;ll hear from us once it&apos;s approved</p>
                  </div>
                </div>
              ) : appStatus === 'APPROVED' ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-xs uppercase tracking-widest text-green-500">Approved!</p>
                    <Link href="/tutor">
                      <Button variant="link" className="text-green-500 p-0 h-auto font-black text-xs uppercase tracking-widest">
                        Go to Tutor Dashboard →
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleApplyTutor}
                  disabled={appLoading}
                  className="w-full sm:w-auto h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-lg transition-all active:scale-95 gap-2"
                >
                  {appLoading ? (
                    <>Loading...</>
                  ) : (
                    <>Apply to Tutor <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
         </div>
       )}
    </div>
  );
}