"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createMatchRequest } from "@/app/actions/match";
import { Zap, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useMatch } from "@/lib/match-context";

import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";

export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();
  const { step: matchStep, matchRequestId, startMatch } = useMatch();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
  });
  const isMatching = matchStep !== "idle";

  useEffect(() => {
    getUserData().then(setUserData).catch(console.error);
    import("@/app/actions/match").then(({ sweepUnmatchedRequests }) => {
      sweepUnmatchedRequests();
    }).catch(console.error);
  }, []);

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

  const subjects = getSubjectsByLevel(userData?.educationLevel || "HIGH_SCHOOL");

  const handleMatchMe = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
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

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans">
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

      <Card className="border-border/50 bg-secondary/30 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardContent className="p-8 md:p-16 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">What subject?</label>
              <Select onValueChange={(v: string | null) => v && setFormData({ ...formData, subject: v })} disabled={isMatching}>
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
                disabled={isMatching}
              />
            </div>
          </div>

          {isMatching ? (
            <div className="flex flex-col items-center gap-4">
              <Button disabled className="w-full h-24 rounded-[2.5rem] bg-primary/30 text-muted-foreground font-black text-xl tracking-[0.2em] uppercase shadow-2xl cursor-not-allowed">
                <Loader2 className="h-8 w-8 mr-4 animate-spin" />
                Searching for help...
              </Button>
              <p className="text-sm text-muted-foreground">
                A match bar appears at the bottom — you can browse the app while we search.
              </p>
            </div>
          ) : (
            <Button
              onClick={handleMatchMe}
              disabled={loading}
              className="w-full h-24 rounded-[2.5rem] bg-foreground text-background hover:bg-primary hover:text-white font-black text-xl tracking-[0.2em] uppercase shadow-2xl transition-all duration-500 active:scale-95 group"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 mr-4 animate-spin" />
              ) : (
                <Zap className="h-8 w-8 mr-4 fill-primary text-primary group-hover:fill-white group-hover:text-white transition-colors" />
              )}
              {loading ? "Starting..." : "Find Me Someone to Help"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
