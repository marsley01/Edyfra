"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, BookOpen, Users, ArrowRight, GraduationCap, Clock, CheckCircle2, XCircle, Loader2, Sparkles, Send } from "lucide-react";
import Link from "next/link";
import { useSafeUserData, useSessionCounter } from "@/hooks/useAntigravityFixes";
import { DashboardLoadingState, DashboardError } from "@/hooks/useAntigravityFixes";
import { applyToBecomeTutor } from "@/app/actions/admin-tutor";
import { getOrCreateDailyChallenge, evaluateChallengeAnswer, saveChallengeAttempt, getTodaysChallenge, getChallengeCompletion, generatePersonalizedChallenge } from "@/app/actions/challenge-ai";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import LevelXPBar from "@/components/dashboard/LevelXPBar";

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

  const [challenge, setChallenge] = useState<any>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; correctAnswer: string } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [completedAttempt, setCompletedAttempt] = useState<any>(null);
  const [generatingPersonalized, setGeneratingPersonalized] = useState(false);

  useEffect(() => {
    if (!userData?.id || !userData?.educationLevel) return;
    const load = async () => {
      try {
        const { getUserSessions } = await import("@/app/actions/match");
        const { getUpcomingStudentBookings } = await import("@/app/actions/bookings");
        const data = await getUserSessions(userData.id);
        const bookings = await getUpcomingStudentBookings();
        setRecentSessions(data.slice(0, 5).map(s => ({
          ...s,
          createdAt: s.startedAt?.toISOString() || new Date().toISOString(),
          topic: s.topic || null
        })));
        setUpcomingBookings(bookings as any[]);
       } catch (err) {
         console.error("Failed to load recent sessions:", err);
       } finally {
         setLoadingRecent(false);
       }
    };
    load();
  }, [userData?.id]);

  useEffect(() => {
    if (!userData?.educationLevel || !userData?.id) return;
    loadChallenge();
  }, [userData?.educationLevel, userData?.id]);

  const loadChallenge = async () => {
    setChallengeLoading(true);
    try {
      const existing = await getTodaysChallenge(userData!.educationLevel as string);
      if (existing) {
        setChallenge(existing);
        const attempt = await getChallengeCompletion(userData!.id, existing.id!);
        if (attempt) {
          setCompleted(true);
          setCompletedAttempt(attempt);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const diff = tomorrow.getTime() - Date.now();
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          setCountdown(`${h}h ${m}m`);
        }
        return;
      }
      const newChallenge = await getOrCreateDailyChallenge(userData!.educationLevel as string);
      if (newChallenge) {
        setChallenge(newChallenge);
        const attempt = await getChallengeCompletion(userData!.id, newChallenge.id!);
        if (attempt) {
          setCompleted(true);
          setCompletedAttempt(attempt);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const diff = tomorrow.getTime() - Date.now();
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          setCountdown(`${h}h ${m}m`);
        }
      }
    } catch (err) {
      console.error("Failed to load challenge:", err);
    } finally {
      setChallengeLoading(false);
    }
  };

  const challengeOptions: string[] = Array.isArray(challenge?.options)
    ? (challenge.options as string[])
    : [];

  const handleSubmitAnswer = async () => {
    const answerText = challengeOptions.length >= 2 ? selectedOption : userAnswer.trim();
    if (!challenge || !answerText || !userData) return;
    setSubmitting(true);
    try {
      const evaluation = await evaluateChallengeAnswer(challenge.id, answerText);
      setResult(evaluation);
      await saveChallengeAttempt(userData.id, challenge.id, evaluation.correct);
      if (evaluation.correct) {
        toast.success("Correct! Points awarded!");
      }
      setCompleted(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - Date.now();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}h ${m}m`);
    } catch (err) {
      toast.error("Failed to evaluate answer");
    } finally {
      setSubmitting(false);
    }
  };

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
          description: "We'll review it and get back to you.",
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

  const handleGeneratePersonalized = async () => {
    if (!userData?.educationLevel || !userData?.id) return;
    setGeneratingPersonalized(true);
    try {
      const personalizedChallenge = await generatePersonalizedChallenge(userData.id, userData.educationLevel);
      if (personalizedChallenge) {
        setChallenge(personalizedChallenge);
        toast.success("Personalized challenge generated!", {
          description: "Based on your recent performance",
        });
      }
    } catch (error) {
      toast.error("Failed to generate personalized challenge", {
        description: "Please try again",
      });
    } finally {
      setGeneratingPersonalized(false);
    }
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
              Ready to learn? {nextMove}
            </p>
         </div>
         <Link href="/dashboard/study">
           <Button className="bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest px-8 sm:px-12 h-12 sm:h-16 rounded-full uppercase shadow-2xl transition-all active:scale-95 gap-3">
             <Zap className="h-4 w-4 fill-current text-primary" />
             Start My Next Session
           </Button>
         </Link>
      </div>

      {/* Level & XP Progress Bar */}
      <LevelXPBar points={userData?.points || 0} streakDays={userData?.streakDays || 0} />

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Activity Log */}
        <div className="lg:col-span-2 p-6 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[3rem] bg-secondary border border-border/50 space-y-6 sm:space-y-8 relative overflow-hidden group">
           <div className="relative z-10 space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tightest">Your Activity</h3>
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{recentSessions.length > 0 ? `Showing ${recentSessions.length} recent sessions` : "Your recent activity will show up here"}</p>
           </div>
           {loadingRecent ? (
             <div className="relative z-10 min-h-[200px] flex items-center justify-center">
               <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
             </div>
           ) : (recentSessions.length > 0 || upcomingBookings.length > 0) ? (
             <div className="relative z-10 space-y-3">
               {upcomingBookings.length > 0 && (
                 <div className="space-y-3 mb-6">
                   <h4 className="text-sm font-black uppercase tracking-widest text-primary">Upcoming Bookings</h4>
                   {upcomingBookings.map((booking) => (
                     <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 transition-all">
                       <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20">
                         {booking.subject[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-bold text-sm truncate">{booking.topic || booking.subject}</p>
                         <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                           With {booking.tutor.name} • {new Date(booking.date).toLocaleDateString()} at {booking.startTime} ({booking.durationMinutes}m)
                         </p>
                       </div>
                       <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                         {booking.status}
                       </div>
                       {booking.status === 'confirmed' && (
                         <Button onClick={() => window.location.href = `/study-room/${booking.id}`} className="bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full h-8 px-4">
                           Join Room
                         </Button>
                       )}
                     </div>
                   ))}
                 </div>
               )}
               
               {recentSessions.length > 0 && <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Past Sessions</h4>}
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
                   No sessions yet. Start your first study session and your activity will show up here.
                </p>
             </div>
           )}
           <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/5 blur-[100px] rounded-full" />
        </div>

        {/* Daily Challenge Card */}
        <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-foreground text-background space-y-6 sm:space-y-10 relative overflow-hidden group shadow-2xl">
           <div className="relative z-10 space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tightest flex items-center gap-3">
                Daily Challenge
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
              </h3>
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-background/40">Test yourself and earn points</p>
           </div>
           <div className="relative z-10 space-y-4">
             {challengeLoading ? (
               <div className="flex items-center justify-center py-12">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
             ) : !challenge ? (
               <div className="p-6 bg-background/5 rounded-[1.5rem] border border-background/10 text-center space-y-2">
                 <p className="text-background/60 font-medium">No challenge available today.</p>
                 <p className="text-background/40 text-sm">Come back tomorrow!</p>
               </div>
             ) : completed && result ? (
               <div className="space-y-4">
                 <div className={`p-6 rounded-[1.5rem] border ${result.correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                   <div className="flex items-center gap-3 mb-3">
                     <div className={`p-2 rounded-xl ${result.correct ? "bg-green-500" : "bg-red-500"}`}>
                       {result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                     </div>
                     <span className="font-bold text-lg">{result.correct ? "Correct!" : "Incorrect"}</span>
                   </div>
                   <p className="text-background/70 text-sm leading-relaxed">{result.explanation}</p>
                   {!result.correct && (
                     <p className="text-primary font-bold mt-2 text-sm">Correct answer: {result.correctAnswer}</p>
                   )}
                 </div>
                 <div className="p-4 bg-background/5 rounded-xl border border-background/10 text-center space-y-2">
                   <p className="text-background/60 font-medium">Challenge completed!</p>
                   <p className="text-primary font-black text-sm">Come back tomorrow</p>
                   <div className="flex items-center justify-center gap-2 text-background/40 text-xs">
                     <Clock className="h-3 w-3" />
                     <span>Next challenge in {countdown}</span>
                   </div>
                 </div>
               </div>
             ) : completed && completedAttempt ? (
               <div className="space-y-4">
                 <div className="p-6 bg-background/5 rounded-[1.5rem] border border-background/10 text-center space-y-3">
                   <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                   <p className="text-background font-bold text-lg">Already Completed</p>
                   <p className="text-background/60 text-sm">
                     Score: {completedAttempt.correct ? "+" : ""}{completedAttempt.pointsEarned || 0} pts
                   </p>
                   <div className="flex items-center justify-center gap-2 text-background/40 text-xs">
                     <Clock className="h-3 w-3" />
                     <span>Next challenge in {countdown}</span>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex items-center gap-2">
                   <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-widest font-black">
                     {challenge?.subject || "General"}
                   </Badge>
                   <Badge variant="outline" className="border-background/20 text-background/60 text-[10px] uppercase tracking-widest font-black">
                     {challenge?.level?.replace("_", " ") || "HIGH SCHOOL"}
                   </Badge>
                 </div>
                 <p className="text-lg font-medium leading-relaxed text-background/90">
                   {challenge?.question || "Loading challenge..."}
                 </p>
                 {challengeOptions.length >= 2 ? (
                   <div className="space-y-2">
                     {challengeOptions.map((option, i) => (
                       <button
                         key={option}
                         type="button"
                         disabled={submitting}
                         onClick={() => setSelectedOption(option)}
                         className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                           selectedOption === option
                             ? "border-primary bg-primary/20 text-background"
                             : "border-background/20 bg-background/5 text-background/80 hover:border-background/40"
                         }`}
                       >
                         <span className="font-black mr-3">{String.fromCharCode(65 + i)}.</span>
                         {option}
                       </button>
                     ))}
                     <Button
                       onClick={handleSubmitAnswer}
                       disabled={submitting || !selectedOption}
                       className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-black uppercase tracking-widest text-xs"
                     >
                       {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Answer"}
                     </Button>
                   </div>
                 ) : (
                   <div className="flex gap-2">
                     <Input
                       value={userAnswer}
                       onChange={(e) => setUserAnswer(e.target.value)}
                       placeholder="Type your answer..."
                       className="flex-1 bg-background/10 border-background/20 text-background placeholder:text-background/40 rounded-xl h-12"
                       disabled={submitting}
                     />
                     <Button
                       onClick={handleSubmitAnswer}
                       disabled={submitting || !userAnswer.trim()}
                       className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-4"
                     >
                       {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                     </Button>
                   </div>
                 )}
                 <div className="mt-4 pt-4 border-t border-background/10">
                   <Button
                     onClick={handleGeneratePersonalized}
                     disabled={generatingPersonalized}
                     variant="outline"
                     className="w-full bg-background/10 border-background/20 text-background hover:bg-background/20 font-black text-xs tracking-widest uppercase"
                   >
                     {generatingPersonalized ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                     Generate Personalized Challenge
                   </Button>
                 </div>
               </div>
             )}
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
                 Find someone who can explain {subjectFocus} in a way that makes sense to you.
             </p>
          </div>
          <Link href="/dashboard/tutors" className="w-full md:w-auto">
             <Button className="w-full md:w-auto h-14 sm:h-16 px-8 sm:px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl hover:bg-foreground/90 transition-all active:scale-95">
               Find My Tutor
             </Button>
          </Link>
       </div>

       {/* Tutor Application Section */}
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
                   Good at {subjectFocus}? Turn your knowledge into impact (and income) by helping other students.
               </p>
            </div>
            <div className="w-full md:w-auto">
              {appStatus === 'PENDING' ? (
                <div className="flex items-center gap-3 p-4 sm:p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 w-full md:w-auto">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-xs sm:text-sm uppercase tracking-widest text-yellow-500">Pending Review</p>
                     <p className="text-[10px] sm:text-xs text-muted-foreground">You&apos;ll hear from us once it&apos;s approved</p>
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