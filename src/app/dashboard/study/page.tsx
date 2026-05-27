"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu, Search, Users, Video, Zap, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cancelMatchRequest, createMatchRequest } from "@/app/actions/match";
import { getUserData } from "@/app/actions/user";
import { getSubjectsByLevel } from "@/utils/subjects";
import { useMatchStore } from "@/store/matchStore";

const MATCH_QUOTES = [
  "\"Education is the most powerful weapon which you can use to change the world.\" - Nelson Mandela",
  "\"The beautiful thing about learning is that no one can take it away from you.\" - B.B. King",
  "\"Live as if you were to die tomorrow. Learn as if you were to live forever.\" - Mahatma Gandhi",
  "\"An investment in knowledge pays the best interest.\" - Benjamin Franklin",
  "\"The only person who is educated is the one who has learned how to learn and change.\" - Carl Rogers",
];

export default function StudyPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<Awaited<ReturnType<typeof getUserData>>>(null);
  const {
    formData,
    isMatching,
    matchStep,
    quoteIndex,
    reset,
    currentRequestId,
    setAiFallbackTriggered,
    setCurrentRequestId,
    setFormData,
    setMatching,
    setMatchStep,
    setTimer,
  } = useMatchStore();

  useEffect(() => {
    getUserData().then(setUserData).catch(console.error);
  }, []);

  const subjects = useMemo(
    () => getSubjectsByLevel(userData?.educationLevel || "HIGH_SCHOOL"),
    [userData?.educationLevel]
  );

  const handleMatchMe = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }

    setMatching(true);
    setMatchStep(1);
    setTimer(90);
    setAiFallbackTriggered(false);

    try {
      const result = await createMatchRequest(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to start matching. Please try again.");
        reset();
        return;
      }

      if (result.sessionId) {
        toast.success(result.tier === "PEER" ? "Study partner found!" : "Tutor found!");
        reset();
        router.push(`/study-room/${result.sessionId}`);
        return;
      }

      setCurrentRequestId(result.matchRequestId || null);
      toast.success("Request submitted! Searching for help...");
    } catch (error) {
      console.error("Matching error:", error);
      toast.error("Failed to start matching. Please try again.");
      reset();
    }
  };

  return (
    <div className="relative mx-auto max-w-5xl space-y-12 p-4 font-sans duration-700 animate-in fade-in md:p-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Start a session</p>
          <h1 className="text-5xl font-black leading-[0.9] tracking-tight md:text-7xl">
            Let&apos;s find you
            <br />
            <span className="text-muted-foreground">the right help.</span>
          </h1>
          <p className="max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
            Choose a subject and we&apos;ll try a tutor first, then a study partner, then Mash AI if needed.
          </p>
        </div>

        <div className="flex items-center justify-center rounded-full border border-border bg-secondary/50 p-1.5">
          <Button variant="ghost" className="h-12 rounded-full bg-background px-6 text-sm font-bold shadow-md hover:bg-background">
            <Zap className="mr-2 h-4 w-4 text-primary" /> Instant Match
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/tutors")}
            className="h-12 rounded-full px-6 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="mr-2 h-4 w-4" /> Book a Session
          </Button>
        </div>
      </div>

      {!isMatching ? (
        <Card className="relative overflow-hidden rounded-[3rem] border-border/50 bg-secondary/30 shadow-2xl backdrop-blur-3xl">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          <CardContent className="space-y-12 p-8 md:p-16">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <div className="space-y-4">
                <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  What subject?
                </label>
                <Select
                  value={formData.subject}
                  onValueChange={(value: string | null) => setFormData({ ...formData, subject: value || "" })}
                >
                  <SelectTrigger className="h-20 rounded-[2rem] border-border bg-background px-8 text-2xl font-black focus:ring-primary">
                    <SelectValue placeholder="Pick a subject" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-2xl border-border">
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject} className="text-lg font-bold">
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  What are you working on? (optional)
                </label>
                <Input
                  placeholder="e.g. Calculus Integration"
                  className="h-20 rounded-[2rem] border-border bg-background px-8 text-xl font-bold focus-visible:ring-primary"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleMatchMe}
              className="group h-24 w-full rounded-[2.5rem] bg-foreground text-xl font-black uppercase tracking-[0.2em] text-background shadow-2xl transition-all duration-500 active:scale-95 hover:bg-primary hover:text-white"
            >
              <Zap className="mr-4 h-8 w-8 fill-primary text-primary transition-colors group-hover:fill-white group-hover:text-white" />
              Find Me Someone to Help
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="relative min-h-[540px] overflow-hidden rounded-[3rem] border-border/50 bg-secondary/30 p-12 text-center shadow-2xl backdrop-blur-3xl md:p-20">
          <div className="mx-auto max-w-3xl space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white/70">
              <Video className="h-4 w-4 text-primary" />
              Stay on this page or keep browsing your dashboard while we search.
            </div>

            <div className="rounded-[2rem] bg-background/60 p-5 shadow-inner">
              <p className="text-sm font-medium italic text-muted-foreground">{MATCH_QUOTES[quoteIndex]}</p>
            </div>

            <AnimatePresence mode="wait">
              {matchStep === 1 && (
                <motion.div
                  key="tutor"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <div className="relative mx-auto h-32 w-32">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative rounded-full bg-primary p-8 text-white shadow-2xl shadow-primary/40">
                      <Search className="h-16 w-16 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black tracking-tightest md:text-5xl">Searching for a tutor...</h2>
                    <p className="text-lg font-medium text-muted-foreground">
                      We&apos;re looking for a tutor who can help with {formData.subject}.
                    </p>
                  </div>
                </motion.div>
              )}

              {matchStep === 2 && (
                <motion.div
                  key="peer"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <div className="relative mx-auto h-32 w-32">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="relative rounded-full bg-blue-500 p-8 text-white shadow-2xl shadow-blue-500/40">
                      <Users className="h-16 w-16 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black tracking-tightest text-blue-500 md:text-5xl">
                      Searching for a study partner...
                    </h2>
                    <p className="text-lg font-medium text-muted-foreground">
                      No tutor yet. Now we&apos;re scanning for another student waiting on {formData.subject}.
                    </p>
                  </div>
                </motion.div>
              )}

              {matchStep === 3 && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <div className="relative mx-auto h-32 w-32">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative rounded-full bg-emerald-500 p-8 text-white shadow-2xl shadow-emerald-500/40">
                      <Cpu className="h-16 w-16 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black tracking-tightest text-emerald-500 md:text-5xl">
                      Mash AI is ready if needed
                    </h2>
                    <p className="text-lg font-medium text-muted-foreground">
                      We&apos;re still checking for a human match, and Mash AI is standing by for {formData.subject}.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="ghost"
              onClick={async () => {
                if (currentRequestId) {
                  try {
                    await cancelMatchRequest(currentRequestId);
                  } catch {
                    // Non-fatal; local reset still matters.
                  }
                }
                reset();
              }}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-red-500"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
