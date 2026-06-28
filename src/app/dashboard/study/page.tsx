"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createMatchRequest } from "@/app/actions/match";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";
import { useMatchStore } from "@/store/matchStore";
import { useMatch } from "@/lib/match-context";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userData, setUserData] = useState<any>(null);
  const aiFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    reset: resetStore
  } = useMatchStore();

  const matchCtx = useMatch();

  // Cleanup AI fallback timer when component unmounts or matching resets
  const clearAiTimer = () => {
    if (aiFallbackTimer.current) {
      clearTimeout(aiFallbackTimer.current);
      aiFallbackTimer.current = null;
    }
  };

  useEffect(() => {
    getUserData().then((data) => {
      setUserData(data);
      if (data?.studentProfile?.subjects?.length && !formData.subject) {
        setFormData({ subject: data.studentProfile.subjects[0], topic: formData.topic });
      }
    }).catch(console.error);

    import("@/app/actions/match").then(({ sweepUnmatchedRequests }) => {
      sweepUnmatchedRequests();
    }).catch(console.error);

    return () => clearAiTimer();
  }, []);

  const subjects = getSubjectsByLevel(userData?.educationLevel || "HIGH_SCHOOL");

  const reset = () => {
    clearAiTimer();
    resetStore();
    matchCtx.cancelMatch();
  };

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
      const requestId = result.matchRequestId!;

      // Start MatchProvider polling (detects tutor acceptance + auto-redirects)
      matchCtx.startMatch(requestId);

      // Broadcast the request to online tutors via Supabase Realtime
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.channel('global-matches').send({
            type: 'broadcast',
            event: 'new-request',
            payload: {
              requestId,
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

      // After the matching window (60s), fall back to AI if still unmatched
      aiFallbackTimer.current = setTimeout(async () => {
        try {
          const { initiateAutoMatch } = await import("@/app/actions/match");
          const matchResult = await initiateAutoMatch(requestId);
          if (matchResult.success && matchResult.sessionId) {
            router.push(`/study-room/${matchResult.sessionId}`);
          }
        } catch (e) {
          console.error("AI fallback failed:", e);
        }
      }, 65000);

      toast.success("Request submitted! Searching for help...");
    } catch (error) {
      console.error("Matching error:", error);
      toast.error("Failed to start matching. Please try again.");
      reset();
    }
  };

  const stepLabel = matchStep === 1
    ? "Finding your expert..."
    : matchStep === 2
      ? "Looking for a study partner..."
      : "Mash AI is ready";

  const stepDescription = matchStep === 1
    ? `Scanning our community for someone who excels at ${formData.subject}.`
    : matchStep === 2
      ? `No tutor available — finding a peer who can help with ${formData.subject}.`
      : `No one's available — Mash AI will guide you through ${formData.subject}.`;

  return (
    <div className="p-4 md:p-8 max-w-sm mx-auto w-full space-y-6 animate-in fade-in duration-700">
      {/* Segmented control toggle */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-full">
        <button className="flex-1 py-2.5 rounded-full bg-white dark:bg-slate-900 shadow-sm text-sm font-semibold text-primary transition-all">
          Instant Match
        </button>
        <button
          onClick={() => router.push("/dashboard/tutors")}
          className="flex-1 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
        >
          Book a Session
        </button>
      </div>

      {!isMatching ? (
        /* ── Form state ── */
        <Card className="rounded-3xl border-border/50 shadow-xl shadow-primary/5 relative overflow-hidden">
          {/* Decorative blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          <CardContent className="relative z-10 p-6 md:p-8 space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-foreground">Find your match</h1>
              <p className="text-sm text-muted-foreground">
                Pick a subject and we&apos;ll find someone to help.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Select value={formData.subject || null} onValueChange={(v: string | null) => v && setFormData({ ...formData, subject: v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-border bg-background text-base">
                    <SelectValue placeholder="Pick a subject" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border max-h-[300px]">
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s} className="font-medium">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Topic (optional)</label>
                <Input
                  placeholder="e.g. Calculus Integration"
                  className="h-12 rounded-2xl border-border bg-background text-base"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleMatchMe}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Find Me Someone to Help
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Matching state ── */
        <Card className="rounded-3xl p-8 shadow-xl shadow-primary/10 border-border/50 text-center relative overflow-hidden">
          {/* Decorative blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Radar animation */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-primary/15 rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                <Search className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-foreground">{stepLabel}</h1>
              <p className="text-sm text-muted-foreground">
                {stepDescription}
              </p>
            </div>

            {/* Timer */}
            <div className="bg-secondary/50 rounded-2xl p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Time remaining
              </div>
              <div className="text-3xl font-mono font-bold text-primary">
                {formatTime(timer)}
              </div>
            </div>

            <button
              onClick={() => reset()}
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Cancel search
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
