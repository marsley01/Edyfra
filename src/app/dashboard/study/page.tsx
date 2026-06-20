"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createMatchRequest } from "@/app/actions/match";
import {
  Zap, Calendar as CalendarIcon, Loader2,
  BookOpen, GraduationCap, ChevronDown, Check,
  Sparkles, BrainCircuit, ArrowRight, MessageCircle,
  Users, Bot, Clock, Shield, Heart
} from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";
import { useMatch } from "@/lib/match-context";
import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";
import { motion, AnimatePresence } from "framer-motion";
import { LottieAnimation } from "@/components/lottie-animation";

const MOTIVATIONAL_QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
];

const SEARCH_STEPS = [
  { key: "tutor", label: "Looking for an expert tutor", icon: GraduationCap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "peer", label: "Asking study buddies nearby", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "ai", label: "Warming up Mash AI as backup", icon: Bot, color: "text-violet-500", bg: "bg-violet-500/10" },
];

const HOW_IT_WORKS = [
  {
    icon: BookOpen,
    title: "Pick a subject",
    body: "Choose what you need help with. Be as specific as you can — it makes matching much faster.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Zap,
    title: "We find your match",
    body: "We try a verified tutor first, then a study buddy, then Mash AI as a guaranteed fallback.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: MessageCircle,
    title: "Start learning",
    body: "Hop into the study room, share your topic, and get unstuck in minutes — not hours.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();
  const { step: matchStep, matchRequestId, startMatch } = useMatch();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
  });
  const [quoteIndex, setQuoteIndex] = useState(0);
  const isMatching = matchStep !== "idle";

  useEffect(() => {
    setUserLoading(true);
    getUserData().then((data) => {
      setUserData(data);
      if (data?.studentProfile?.subjects && data.studentProfile.subjects.length > 0) {
        setFormData(prev => ({ ...prev, subject: data.studentProfile!.subjects[0] }));
      }
      setUserLoading(false);
    }).catch((err) => {
      console.error(err);
      setUserLoading(false);
    });
    import("@/app/actions/match").then(({ sweepUnmatchedRequests }) => {
      sweepUnmatchedRequests();
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isMatching) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isMatching]);

  useEffect(() => {
    if (!matchRequestId) return;
    const channel = supabase
      .channel(`match-${matchRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "MatchRequest",
          filter: `id=eq.${matchRequestId}`,
        },
        (payload: any) => {
          if (payload.new?.sessionId) {
            showSuccess("Match found!", { description: "Taking you there now." });
            router.push(`/study-room/${payload.new.sessionId}`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchRequestId, router, supabase]);

  const educationLevel = userData?.educationLevel || "HIGH_SCHOOL";
  const subjects = getSubjectsByLevel(educationLevel);
  const isUniversity = educationLevel?.includes("UNIVERSITY");
  const firstName = userData?.name?.split(" ")[0] || "there";

  const currentSearchStep = useMemo(() => {
    return SEARCH_STEPS.find(s => s.key === matchStep) || SEARCH_STEPS[0];
  }, [matchStep]);

  const handleMatchMe = async () => {
    if (!formData.subject) {
      showError({
        title: "Pick a subject first",
        cause: "We need to know which subject you want help with.",
        fix: "Choose a subject from the list, then tap Match me again.",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await createMatchRequest(formData);
      if (!result.success) {
        showError({
          title: "We couldn't start that match",
          cause: result.error || "Something didn't go through on our end.",
          fix: "Give it another try in a sec.",
        });
        setLoading(false);
        return;
      }
      startMatch(result.matchRequestId!);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.channel('global-matches').send({
            type: 'broadcast',
            event: 'new-request',
            payload: {
              requestId: result.matchRequestId,
              studentId: user.id,
              studentName: user.user_metadata?.name || 'A student',
              subject: formData.subject,
              topic: formData.topic || 'General'
            }
          });
        } catch {}
      }
      import("@/app/actions/match").then(({ initiateAutoMatch }) => {
        initiateAutoMatch(result.matchRequestId!);
      }).catch(console.error);
      showSuccess("We're on it!", {
        description: "Hang tight — feel free to keep browsing. We'll ping you the moment we find someone for you.",
      });
    } catch (error) {
      console.error("Matching error:", error);
      showError({
        title: "Something hiccuped",
        cause: "A hiccup on our side blocked that.",
        fix: "Give it another try in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-lg font-bold text-muted-foreground">Getting things ready for you…</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          {isUniversity ? "Loading your university courses…" : "Loading your subjects…"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 font-sans">

      {/* Header — friendlier, more personal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Find me someone to help</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
            Hey {firstName}, <br />
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">let&apos;s unstuck you.</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-medium max-w-xl leading-relaxed">
            Tell us what you&apos;re stuck on and we&apos;ll find someone to help — usually in under 30 seconds. If no one&apos;s free, <span className="text-emerald-500 font-semibold">Mash AI never sleeps</span> and is always ready to jump in.
          </p>
        </div>

        <div className="flex items-center justify-center bg-secondary/50 p-1.5 rounded-full border border-border shrink-0">
          <Button variant="ghost" className="rounded-full bg-background shadow-md px-5 font-bold text-xs h-11 hover:bg-background">
            <Zap className="mr-2 h-4 w-4 text-primary" /> Instant Match
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard/tutors")} className="rounded-full px-5 font-bold text-xs h-11 text-muted-foreground hover:text-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" /> Book a Session
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isMatching ? (
          <motion.div
            key="matching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-background to-violet-500/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/30 via-primary to-violet-500/30 overflow-hidden">
                <motion.div
                  className="h-full w-1/3 bg-white/40 rounded-full"
                  animate={{ x: ["-100%", "400%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <CardContent className="p-8 md:p-16 flex flex-col items-center text-center space-y-8">
                {/* Lottie + current step */}
                <div className="relative w-48 h-48 md:w-64 md:h-64">
                  <LottieAnimation
                    url="/animations/study-spinner.json"
                    className="w-full h-full"
                    ariaLabel="Searching"
                  />
                </div>

                <div className="space-y-2 max-w-md">
                  <motion.p
                    key={currentSearchStep.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base md:text-lg font-black text-foreground"
                  >
                    {currentSearchStep.label}…
                  </motion.p>
                  <p className="text-muted-foreground text-sm">
                    Hang on — we&apos;re knocking on doors. Most people get matched in under 30 seconds.
                  </p>
                </div>

                {/* Search steps */}
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between">
                    {SEARCH_STEPS.map((step, i) => {
                      const isActive = step.key === matchStep;
                      const isPast = SEARCH_STEPS.findIndex(s => s.key === matchStep) > i;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center gap-2 flex-1 last:flex-none">
                          <motion.div
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                              isPast
                                ? `${step.bg} ${step.color} border-current`
                                : isActive
                                  ? `${step.bg} ${step.color} border-current animate-pulse`
                                  : 'bg-secondary border-border text-muted-foreground'
                            }`}
                          >
                            {isPast ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4 md:h-5 md:w-5" />}
                          </motion.div>
                          {i < SEARCH_STEPS.length - 1 && (
                            <div className={`hidden sm:block flex-1 h-0.5 rounded-full transition-colors duration-500 ${isPast ? 'bg-primary' : 'bg-border'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rotating quote */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-lg space-y-2 pt-4 border-t border-border/50"
                  >
                    <p className="text-foreground/70 italic text-sm md:text-base font-medium leading-relaxed">
                      &ldquo;{MOTIVATIONAL_QUOTES[quoteIndex].text}&rdquo;
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      — {MOTIVATIONAL_QUOTES[quoteIndex].author}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <p className="text-xs text-muted-foreground/60 font-medium">
                  You can keep browsing — we&apos;ll let you know the second we find someone.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <Card className="border-border/50 bg-secondary/30 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-violet-500/50" />
              <CardContent className="p-6 md:p-12 lg:p-16 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* Subject selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      What are we tackling?
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                        disabled={isMatching}
                        className={`w-full h-16 md:h-20 rounded-2xl md:rounded-[2rem] border bg-background px-6 md:px-8 text-left flex items-center justify-between transition-all duration-300 group ${
                          subjectDropdownOpen
                            ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        <span className={`text-lg md:text-2xl font-black truncate ${formData.subject ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                          {formData.subject || "Pick a subject…"}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${subjectDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {subjectDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="max-h-[280px] overflow-y-auto py-2">
                              {subjects.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    setFormData({ ...formData, subject: s });
                                    setSubjectDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-6 py-3.5 flex items-center justify-between hover:bg-secondary/80 transition-colors ${
                                    formData.subject === s ? 'bg-primary/5 text-primary' : 'text-foreground'
                                  }`}
                                >
                                  <span className="font-bold text-base">{s}</span>
                                  {formData.subject === s && <Check className="h-4 w-4 text-primary" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {formData.subject && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-emerald-500 font-medium ml-1 flex items-center gap-1.5"
                      >
                        <Check className="h-3 w-3" /> {formData.subject} — good choice
                      </motion.p>
                    )}
                  </div>

                  {/* Topic input */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <BrainCircuit className="h-3.5 w-3.5" />
                      What part? <span className="text-muted-foreground/40">(optional but helps a lot)</span>
                    </label>
                    <Input
                      placeholder="e.g. Integration by parts"
                      className="h-16 md:h-20 rounded-2xl md:rounded-[2rem] border-border bg-background font-bold px-6 md:px-8 text-lg md:text-xl focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      disabled={isMatching}
                    />
                  </div>
                </div>

                {/* Match button */}
                <Button
                  onClick={handleMatchMe}
                  disabled={loading || !formData.subject}
                  className={`w-full h-16 md:h-20 rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-lg tracking-[0.15em] uppercase shadow-2xl transition-all duration-500 active:scale-[0.98] group ${
                    formData.subject
                      ? 'bg-gradient-to-r from-primary to-violet-500 text-white hover:shadow-primary/30'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      Finding you someone…
                    </>
                  ) : (
                    <>
                      <Zap className="h-6 w-6 mr-3 fill-white text-white" />
                      Find me someone to help
                      <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">Average match time: under 30 seconds</span>
                </div>
              </CardContent>
            </Card>

            {/* How it works — friendlier, more visual */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tightest">How it works</h2>
                <p className="text-sm text-muted-foreground">Three steps. No fuss. We do the heavy lifting.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HOW_IT_WORKS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl ${step.bg} ${step.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step {i + 1}</span>
                      </div>
                      <h3 className="text-lg font-black tracking-tightest mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Trust strip — tiny, friendly, builds confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black">Verified tutors</p>
                  <p className="text-[10px] text-muted-foreground">Background-checked experts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black">30-sec average</p>
                  <p className="text-[10px] text-muted-foreground">No waiting around</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black">Free to start</p>
                  <p className="text-[10px] text-muted-foreground">Pay only if you book</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {subjectDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSubjectDropdownOpen(false)} />
      )}
    </div>
  );
}
