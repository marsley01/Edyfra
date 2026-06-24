"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createMatchRequest } from "@/app/actions/match";
import { Zap, Search, Users, Cpu, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";
import { useMatchStore } from "@/store/matchStore";

const QUOTES = [
  "\"Education is the most powerful weapon which you can use to change the world.\" - Nelson Mandela",
  "\"The beautiful thing about learning is that no one can take it away from you.\" - B.B. King",
  "\"Live as if you were to die tomorrow. Learn as if you were to live forever.\" - Mahatma Gandhi",
  "\"An investment in knowledge pays the best interest.\" - Benjamin Franklin",
  "\"The only person who is educated is the one who has learned how to learn and change.\" - Carl Rogers"
];

export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userData, setUserData] = useState<any>(null);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const {
    isMatching,
    matchStep,
    timer,
    formData,
    setMatching,
    setMatchStep,
    setTimer,
    setFormData,
    setCurrentRequestId,
    reset
  } = useMatchStore();

  useEffect(() => {
    getUserData().then((data) => {
      setUserData(data);
      if (data?.studentProfile?.subjects?.length && !formData.subject) {
        setFormData({ subject: data.studentProfile.subjects[0], topic: formData.topic });
      }
      setSubjectsLoaded(true);
    }).catch(console.error);
    
    // Sweep unmatched requests on mount
    import("@/app/actions/match").then(({ sweepUnmatchedRequests }) => {
      sweepUnmatchedRequests();
    }).catch(console.error);
  }, []);

  // Rotate quotes every 5 seconds while matching
  useEffect(() => {
    if (!isMatching) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isMatching]);

  const subjects = getSubjectsByLevel(userData?.educationLevel || "HIGH_SCHOOL");

  const handleMatchMe = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }

    setMatching(true);
    setMatchStep(1);
    setTimer(90);

    try {
      const result = await createMatchRequest(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to start matching. Please try again.");
        reset();
        return;
      }
      
      setCurrentRequestId(result.matchRequestId || null);
      
      // Broadcast the request to all online users/tutors
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
        } catch (broadcastErr) {
          console.error('Broadcast failed, but matching continues:', broadcastErr);
        }
      }
      
      toast.success("Request submitted! Searching for help...");
    } catch (error) {
      console.error("Matching error:", error);
      toast.error("Failed to start matching. Please try again.");
      reset();
    }
  };

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Start a session</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-[0.9]">
            Let&apos;s find you <br /> <span className="text-muted-foreground">some help.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            Pick a subject and we&apos;ll find someone to help — a tutor, a study buddy, or Mash AI. <span className="text-emerald-500">Mash AI is always available in your room.</span>
          </p>
        </div>
        
        <div className="flex items-center justify-center bg-secondary/50 p-1.5 rounded-full border border-border">
          <Button variant="ghost" className="rounded-full bg-background shadow-md px-6 font-bold text-sm h-12 hover:bg-background">
            <Zap className="mr-2 h-4 w-4 text-primary" /> Instant Match
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard/tutors")} className="rounded-full px-6 font-bold text-sm h-12 text-muted-foreground hover:text-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" /> Book a Session
          </Button>
        </div>
      </div>

      {!isMatching ? (
        <Card className="border-border/50 bg-secondary/30 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          <CardContent className="p-8 md:p-16 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">What subject?</label>
                <Select value={formData.subject || null} onValueChange={(v: string | null) => v && setFormData({ ...formData, subject: v })}>
                  <SelectTrigger className="h-20 rounded-[2rem] border-border bg-background font-black px-8 text-2xl focus:ring-primary">
                    <SelectValue placeholder="Pick a subject" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border max-h-[300px]">
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s} className="font-bold text-lg">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">What are you working on? (optional)</label>
                <Input
                  placeholder="e.g. Calculus Integration"
                  className="h-20 rounded-[2rem] border-border bg-background font-bold px-8 text-xl focus-visible:ring-primary"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>
            </div>

            <Button 
              onClick={handleMatchMe} 
              className="w-full h-24 rounded-[2.5rem] bg-foreground text-background hover:bg-primary hover:text-white font-black text-xl tracking-[0.2em] uppercase shadow-2xl transition-all duration-500 active:scale-95 group"
            >
              <Zap className="h-8 w-8 mr-4 fill-primary text-primary group-hover:fill-white group-hover:text-white transition-colors" />
               Find Me Someone to Help
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="min-h-[500px] flex flex-col items-center justify-center text-center p-12 md:p-20 border-border/50 bg-secondary/30 backdrop-blur-3xl rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 h-2 bg-primary transition-all duration-1000 shadow-[0_0_20px_rgba(139,92,246,0.5)]" style={{ width: `${(timer/90)*100}%` }} />
          
          <div className="absolute top-8 left-0 w-full px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={quoteIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-muted-foreground/80 text-sm font-medium italic"
              >
                {QUOTES[quoteIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {matchStep === 1 && (
              <motion.div
                key="tutor"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="space-y-10 mt-8"
              >
                <div className="relative mx-auto w-32 h-32">
                   <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                   <div className="relative bg-primary text-white p-8 rounded-full shadow-2xl shadow-primary/40">
                     <Search className="h-16 w-16 animate-pulse" />
                   </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Searching for a tutor...</h2>
                  <p className="text-muted-foreground text-lg font-medium">Looking for someone who knows {formData.subject}. <span className="text-emerald-500">Mash AI is already listening in your room.</span></p>
                  <div className="pt-6 flex flex-col items-center gap-3">
                     <span className="px-6 py-2 rounded-full bg-primary/10 text-primary font-black text-xs tracking-widest uppercase">{timer}s left</span>
                     <p className="text-xs text-muted-foreground font-medium">You can navigate away. We'll notify you when a match is found.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {matchStep === 2 && (
              <motion.div
                key="peer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="space-y-10 mt-8"
              >
                <div className="relative mx-auto w-32 h-32">
                   <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                   <div className="relative bg-blue-500 text-white p-8 rounded-full shadow-2xl shadow-blue-500/40">
                     <Users className="h-16 w-16 animate-pulse" />
                   </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tightest text-blue-500">Searching for a study partner...</h2>
                  <p className="text-muted-foreground text-lg font-medium">No tutor available — looking for a peer who can help with {formData.subject}. <span className="text-emerald-500">Mash AI is still listening.</span></p>
                  <div className="pt-6 flex flex-col items-center gap-3">
                     <span className="px-6 py-2 rounded-full bg-blue-500/10 text-blue-500 font-black text-xs tracking-widest uppercase">{timer}s left</span>
                     <p className="text-xs text-muted-foreground font-medium">You can navigate away. We'll notify you when a match is found.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {matchStep === 3 && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="space-y-10 mt-8"
              >
                <div className="relative mx-auto w-32 h-32">
                   <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                   <div className="relative bg-emerald-500 text-white p-8 rounded-full shadow-2xl shadow-emerald-500/40">
                     <Cpu className="h-16 w-16 animate-pulse" />
                   </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tightest text-emerald-500">Mash AI has you covered</h2>
                  <p className="text-muted-foreground text-lg font-medium">No one&apos;s available right now — Mash AI will guide you through {formData.subject}.</p>
                  <div className="pt-6 flex justify-center gap-2">
                     <Sparkles className="h-5 w-5 text-emerald-500" />
                     <span className="text-emerald-500 font-black text-xs tracking-widest uppercase">AI Ready</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            onClick={() => reset()}
            className="mt-16 text-muted-foreground hover:text-red-500 font-black text-[10px] tracking-widest uppercase transition-colors"
          >
            Cancel
          </Button>
        </Card>
      )}
    </div>
  );
}
