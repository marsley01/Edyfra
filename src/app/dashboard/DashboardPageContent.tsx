"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, BookOpen, Flame, Trophy, TrendingUp, Users, ArrowRight, GraduationCap, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSafeUserData, useSessionCounter } from "@/hooks/useAntigravityFixes";
import { DashboardLoadingState, DashboardError } from "@/hooks/useAntigravityFixes";
import { applyToBecomeTutor } from "@/app/actions/admin-tutor";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface RecentSession {
  id: string;
  subject: string;
  topic: string | null;
  status: string;
  createdAt: string;
  partner?: { name: string } | null;
  tier: string;
}

export default function DashboardPageContent() {
  const { userData, loading: userDataLoading, error: userDataError, retryCount, setRetryCount } = useSafeUserData();
  const { sessionCount, loading: sessionsLoading } = useSessionCounter(userData?.id || '');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [appStatus, setAppStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');
  const [appLoading, setAppLoading] = useState(false);

  useEffect(() => {
    if (!userData?.id) return;
    const load = async () => {
      try {
        const { getUserSessions } = await import("@/app/actions/match");
        const data = await getUserSessions(userData.id);
         setRecentSessions(data.slice(0, 5).map(s => ({
           ...s,
           createdAt: s.startedAt?.toISOString() || new Date().toISOString(),
           topic: s.topic || null
         })));
       } catch (err) {
         console.error("Failed to load recent sessions:", err);
       } finally {
         setLoadingRecent(false);
       }
    };
    load();
  }, [userData?.id]);

  // Check tutor application status
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
        toast.success("Application Submitted!", {
          description: "Your tutor application is pending admin approval.",
        });
      } else {
        toast.error("Application failed", {
          description: result.error || "Please try again.",
        });
      }
    } catch (err: any) {
      toast.error("Application failed", {
        description: err.message || "Please try again.",
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

  const stats = [
    { label: "Total Points", value: userData?.points?.toLocaleString() || "0", icon: Trophy },
    { label: "Study Streak", value: `${userData?.streakDays || 0} Days`, icon: Flame },
    { label: "Total Sessions", value: sessionCount.toString(), icon: BookOpen },
    { label: "Current Rank", value: userData?.tier || "BRONZE", icon: TrendingUp },
  ];
  const firstName = userData?.name?.split(" ")[0] || "there";
  const subjectFocus = userData?.studentProfile?.subjects?.[0] || "your toughest subject";
  const weakTopic = userData?.studentProfile?.weakTopics?.[0] || "one topic that needs attention";
  const nextMove = sessionCount > 0
    ? `Pick up from ${recentSessions[0]?.topic || recentSessions[0]?.subject || subjectFocus} and keep the streak alive.`
    : `Start with ${subjectFocus}. One focused session is enough to get your dashboard moving.`;

  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-1000 font-sans">
      {/* Personalized Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 pb-8 md:pb-12 border-b border-border">
         <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tightest leading-none">
              Hey, <span className="text-primary">{firstName}.</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl font-medium max-w-xl">
              Your study space is ready. Today&apos;s best move: {nextMove}
            </p>
         </div>
         <Link href="/dashboard/study">
           <Button className="bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest px-8 sm:px-12 h-12 sm:h-16 rounded-full uppercase shadow-2xl transition-all active:scale-95 gap-3">
             <Zap className="h-4 w-4 fill-current text-primary" />
             Start My Next Session
           </Button>
         </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 sm:p-8 bg-secondary rounded-[2rem] md:rounded-[2.5rem] border border-border/50 space-y-4 sm:space-y-6 group hover:bg-background hover:shadow-2xl hover:translate-y-[-4px] transition-all">
             <div className="flex items-center justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm border border-border group-hover:bg-primary group-hover:text-white transition-colors">
                   <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</span>
             </div>
             <div className="text-2xl sm:text-3xl font-black tracking-tightest tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Activity Log */}
        <div className="lg:col-span-2 p-6 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[3rem] bg-secondary border border-border/50 space-y-6 sm:space-y-8 relative overflow-hidden group">
           <div className="relative z-10 space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tightest">Your Activity</h3>
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{recentSessions.length > 0 ? `Showing ${recentSessions.length} recent sessions` : "Your study sessions and progress will show up here"}</p>
           </div>
           {loadingRecent ? (
             <div className="relative z-10 min-h-[200px] flex items-center justify-center">
               <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
             </div>
           ) : recentSessions.length > 0 ? (
             <div className="relative z-10 space-y-3">
               {recentSessions.map((session) => (
                 <Link href={`/study-room/${session.id}`} key={session.id} className="block">
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all group/item">
                     <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                       {session.subject[0]}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-sm truncate">{session.topic || session.subject}</p>
                       <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                         {session.partner?.name ? (session.tier === "TUTOR" ? "Tutor Session" : "Peer Session") : "Mash AI Session"} • {new Date(session.createdAt).toLocaleDateString()}
                       </p>
                     </div>
                     <div className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-secondary">
                       {session.status}
                     </div>
                   </div>
                 </Link>
               ))}
               <Link href="/dashboard/sessions" className="block text-center pt-4">
                 <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary">
                   View All Sessions →
                 </Button>
               </Link>
             </div>
           ) : (
             <div className="relative z-10 min-h-[200px] sm:min-h-[300px] flex flex-col items-center justify-center text-center p-8 sm:p-12 space-y-4 sm:space-y-6 bg-background rounded-[1.5rem] sm:rounded-[2rem] border border-border/50">
                <div className="bg-secondary p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm">
                   <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/20" />
                </div>
              <p className="text-muted-foreground font-medium text-base sm:text-lg max-w-sm">
                  You haven&apos;t had any sessions yet. Start one and this space will turn into your personal study timeline.
                </p>
             </div>
           )}
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/5 blur-[100px] rounded-full" />
        </div>

        {/* Daily Quest */}
        <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-black text-white space-y-6 sm:space-y-10 relative overflow-hidden group shadow-2xl">
           <div className="relative z-10 space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tightest flex items-center gap-3">
                Daily Goal
                <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
              </h3>
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Keep your streak going</p>
           </div>
           <div className="relative z-10 p-6 sm:p-8 bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 space-y-6 sm:space-y-8">
              <p className="text-base sm:text-lg font-medium leading-relaxed opacity-80">
                Spend 20 minutes on {weakTopic}. You do not need a perfect plan, just one clear question to work through.
              </p>
              <Link href="/dashboard/challenges" className="block w-full">
                <Button className="w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase rounded-full shadow-2xl transition-all active:scale-95">
                  Choose A Challenge <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
           </div>
           <div className="absolute bottom-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/20 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2" />
        </div>
      </div>

       {/* Expert Network Highlight */}
       <div className="p-6 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[3rem] bg-background border border-border shadow-sm flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 group hover:shadow-2xl transition-all duration-700">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] bg-secondary flex items-center justify-center text-primary shadow-sm border border-border group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 flex-shrink-0">
             <Users className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <div className="flex-1 space-y-3 sm:space-y-4 text-center md:text-left">
             <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-primary">Find a Mentor</p>
             <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tightest leading-none">
               Get help when <br /> <span className="text-muted-foreground">you hit a wall.</span>
             </h1>
             <p className="text-muted-foreground font-medium text-base sm:text-lg md:text-xl">
                Find someone who can explain {subjectFocus} in a way that finally clicks.
             </p>
          </div>
          <Link href="/dashboard/tutors" className="w-full md:w-auto">
             <Button className="w-full md:w-auto h-14 sm:h-16 px-8 sm:px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl hover:bg-foreground/90 transition-all active:scale-95">
               Find My Tutor
             </Button>
          </Link>
       </div>

       {/* Tutor Application Section - Only show for students */}
       {userData?.role === 'STUDENT' && (
         <div className="p-6 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 shadow-sm flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 group hover:shadow-2xl transition-all duration-700">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 flex-shrink-0">
               <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="flex-1 space-y-3 sm:space-y-4 text-center md:text-left">
               <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-primary">Earn while helping</p>
               <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tightest leading-none">
                 Become a <span className="text-primary">Tutor.</span>
               </h1>
               <p className="text-muted-foreground font-medium text-base sm:text-lg md:text-xl">
                  If you are strong in {subjectFocus}, you can help other students while building your own profile.
               </p>
            </div>
            <div className="w-full md:w-auto">
              {appStatus === 'PENDING' ? (
                <div className="flex items-center gap-3 p-4 sm:p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 w-full md:w-auto">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-xs sm:text-sm uppercase tracking-widest text-yellow-500">Application Pending</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">We'll notify you once approved</p>
                  </div>
                </div>
              ) : appStatus === 'APPROVED' ? (
                <div className="flex items-center gap-3 p-4 sm:p-6 rounded-2xl bg-green-500/10 border border-green-500/20 w-full md:w-auto">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-xs sm:text-sm uppercase tracking-widest text-green-500">Approved!</p>
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
                  className="w-full md:w-auto h-14 sm:h-16 px-8 sm:px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95 gap-3"
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
