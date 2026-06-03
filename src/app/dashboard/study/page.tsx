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
  Sparkles, BrainCircuit
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useMatch } from "@/lib/match-context";
import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";
import { motion, AnimatePresence } from "framer-motion";

const MOTIVATIONAL_QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
];

const SEARCH_STEPS = [
  { key: "tutor", label: "Searching Verified Tutors", emoji: "🎓", description: "Looking for an expert who can help you right now..." },
  { key: "peer", label: "Finding Study Buddies", emoji: "👥", description: "Expanding search to top-rated peers in your area..." },
  { key: "ai", label: "Preparing Mash AI", emoji: "🤖", description: "Your AI study companion is always ready to help!" },
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

  // Load user data + pre-select their subject
  useEffect(() => {
    setUserLoading(true);
    getUserData().then((data) => {
      setUserData(data);
      // Pre-select user's primary subject from their profile
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

  // Cycle quotes during matching
  useEffect(() => {
    if (!isMatching) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isMatching]);

  // Realtime subscription for instant match redirect
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
            toast.success("Match found! Redirecting...");
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

  const currentSearchStep = useMemo(() => {
    return SEARCH_STEPS.find(s => s.key === matchStep) || SEARCH_STEPS[0];
  }, [matchStep]);

  const handleMatchMe = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject first");
      return;
    }
    setLoading(true);
    try {
      const result = await createMatchRequest(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to start matching. Please try again.");
        setLoading(false);
        return;
      }
      startMatch(result.matchRequestId!);
      // Broadcast the request to online tutors
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
      // Trigger smart matching (tier1 → tier2 → tier3)
      import("@/app/actions/match").then(({ initiateAutoMatch }) => {
        initiateAutoMatch(result.matchRequestId!);
      }).catch(console.error);
      toast.success("Searching for help! You can browse the app while we look.");
    } catch (error) {
      console.error("Matching error:", error);
      toast.error("Failed to start matching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial page load skeleton
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
        <p className="text-lg font-bold text-muted-foreground">Loading your study profile...</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          {isUniversity ? "Preparing university courses..." : "Preparing your subjects..."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Start a session</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
            Let&apos;s find you <br /> <span className="text-muted-foreground">some help.</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-medium max-w-xl leading-relaxed">
            Pick a subject and we&apos;ll find someone to help — a tutor, a study buddy, or Mash AI. <span className="text-emerald-500 font-semibold">Mash AI is always available.</span>
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

      {/* Education Level Badge */}
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold ${isUniversity ? 'bg-purple-500/10 border-purple-500/20 text-purple-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'}`}>
          <GraduationCap className="h-4 w-4" />
          {isUniversity ? "University Level" : "High School Level"}
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Showing subjects for your education level
        </p>
      </div>

      {/* Main Card */}
      <AnimatePresence mode="wait">
        {isMatching ? (
          /* ====== MATCHING STATE — Premium Loading ====== */
          <motion.div
            key="matching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-background to-primary/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 overflow-hidden">
                <motion.div
                  className="h-full w-1/3 bg-white/40 rounded-full"
                  animate={{ x: ["-100%", "400%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <CardContent className="p-8 md:p-16 flex flex-col items-center text-center space-y-10">
                
                {/* Animated Rings */}
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <motion.div
                    className="absolute inset-0 rounded-full border-[3px] border-primary/20"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border-[3px] border-primary/30"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                  />
                  <motion.div
                    className="absolute inset-4 rounded-full border-[3px] border-primary/40"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                  />
                  <div className="absolute inset-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <motion.span
                      className="text-5xl md:text-6xl"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {currentSearchStep.emoji}
                    </motion.span>
                  </div>
                </div>

                {/* Search Step Info */}
                <div className="space-y-3 max-w-md">
                  <motion.p
                    key={currentSearchStep.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-primary"
                  >
                    {currentSearchStep.label}
                  </motion.p>
                  <p className="text-muted-foreground font-medium text-sm md:text-base">
                    {currentSearchStep.description}
                  </p>
                </div>

                {/* Dynamic Island Progress */}
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between mb-3">
                    {SEARCH_STEPS.map((step, i) => {
                      const isActive = step.key === matchStep;
                      const isPast = SEARCH_STEPS.findIndex(s => s.key === matchStep) > i;
                      return (
                        <div key={step.key} className="flex items-center gap-2">
                          <motion.div
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center text-sm md:text-lg border-2 transition-all duration-500 ${
                              isPast 
                                ? 'bg-primary border-primary text-white' 
                                : isActive 
                                  ? 'bg-primary/10 border-primary text-primary animate-pulse' 
                                  : 'bg-secondary border-border text-muted-foreground'
                            }`}
                          >
                            {isPast ? <Check className="h-4 w-4" /> : step.emoji}
                          </motion.div>
                          {i < SEARCH_STEPS.length - 1 && (
                            <div className={`hidden sm:block w-12 md:w-20 h-0.5 rounded-full transition-colors duration-500 ${isPast ? 'bg-primary' : 'bg-border'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quote */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.5 }}
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
                  You can browse the app while we search. A notification will appear when matched.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* ====== IDLE STATE — Subject Selection ====== */
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-border/50 bg-secondary/30 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              <CardContent className="p-6 md:p-12 lg:p-16 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Subject Selector — Custom Dropdown */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" /> 
                      Your Subject
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
                          {formData.subject || "Pick a subject"}
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
                        className="text-xs text-emerald-500 font-medium ml-1"
                      >
                        ✓ {formData.subject} selected
                      </motion.p>
                    )}
                  </div>
                  
                  {/* Topic Input */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <BrainCircuit className="h-3.5 w-3.5" />
                      What are you working on? <span className="text-muted-foreground/40">(optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. Calculus Integration"
                      className="h-16 md:h-20 rounded-2xl md:rounded-[2rem] border-border bg-background font-bold px-6 md:px-8 text-lg md:text-xl focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      disabled={isMatching}
                    />
                  </div>
                </div>

                {/* Match Button */}
                <Button
                  onClick={handleMatchMe}
                  disabled={loading || !formData.subject}
                  className={`w-full h-16 md:h-20 rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-lg tracking-[0.15em] uppercase shadow-2xl transition-all duration-500 active:scale-[0.98] group ${
                    formData.subject
                      ? 'bg-foreground text-background hover:bg-primary hover:text-white hover:shadow-primary/30'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-6 w-6 mr-3 fill-primary text-primary group-hover:fill-white group-hover:text-white transition-colors" />
                      Find Me Someone to Help
                    </>
                  )}
                </Button>

                {/* Helper text */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-medium">Average match time: under 30 seconds</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown on click outside */}
      {subjectDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSubjectDropdownOpen(false)} />
      )}
    </div>
  );
}
