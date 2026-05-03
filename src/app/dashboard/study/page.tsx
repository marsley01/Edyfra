"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createMatchRequest, forceAIFallback } from "@/app/actions/match";
import { Zap, Search, Users, Cpu } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";

export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isMatching, setIsMatching] = useState(false);
  const [matchStep, setMatchStep] = useState(0); // 0: Idle, 1: Tutor, 2: Peer, 3: AI
  const [timer, setTimer] = useState(30);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
  });
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getUserData().then(setUserData);
  }, []);

  const subjects = getSubjectsByLevel(userData?.educationLevel);

  const handleMatchMe = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }

    setIsMatching(true);
    setMatchStep(1);
    setTimer(30);

    try {
      const result = await createMatchRequest(formData);
      if (result.success) {
        setCurrentRequestId(result.matchRequestId);
        
        // Broadcast the request to all online users
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          supabase.channel('global-matches').send({
            type: 'broadcast',
            event: 'new-request',
            payload: {
              requestId: result.matchRequestId,
              studentId: user.id,
              studentName: user.user_metadata?.name || 'A student',
              subject: formData.subject,
              topic: formData.topic
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to start matching. Please try again.");
      setIsMatching(false);
    }
  };

  const handleAIFallback = useCallback(async () => {
    if (!currentRequestId) return;
    
    setMatchStep(3);
    try {
      const result = await forceAIFallback(currentRequestId);
      if (result.success) {
        toast.info("Connecting you to Mash AI...");
        router.push(`/study-room/${result.sessionId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("AI fallback failed. Please try again.");
      setIsMatching(false);
    }
  }, [currentRequestId, router]);

  useEffect(() => {
    if (!currentRequestId) return;

    // 1. Listen for Database Changes (Prisma updates)
    const channel = supabase
      .channel(`match-${currentRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "MatchRequest",
          filter: `id=eq.${currentRequestId}`,
        },
        (payload) => {
          if (payload.new.sessionId) {
            toast.success("Match found! Redirecting...");
            router.push(`/study-room/${payload.new.sessionId}`);
          }
        }
      )
      .subscribe();

    // 2. Start the timer and cascade
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) return 0;
        const newTime = prev - 1;
        // Cascade logic
        if (newTime === 20) setMatchStep(2); 
        if (newTime === 10) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAIFallback();
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentRequestId, router, supabase, handleAIFallback]);

  // Remove the old timer === 0 check as we now trigger at 10

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Find a Study Partner</h1>
        <p className="text-muted-foreground mt-1">Get help in 30 seconds from a tutor, peer, or Mash AI.</p>
      </div>

      {!isMatching ? (
        <Card>
          <CardHeader>
            <CardTitle>Match Me</CardTitle>
            <CardDescription>Tell us what you&apos;re working on right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select onValueChange={(v: string | null) => v && setFormData({ ...formData, subject: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic (Optional)</label>
              <Input
                placeholder="e.g. Quadratic Equations"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleMatchMe} className="w-full gap-2 py-6 text-lg">
              <Zap className="h-5 w-5 fill-current" />
              Match Me
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-primary transition-all duration-1000" style={{ width: `${(timer/30)*100}%` }} />
          
          <AnimatePresence mode="wait">
            {matchStep === 1 && (
              <motion.div
                key="tutor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                   <div className="relative bg-primary/10 p-6 rounded-full">
                     <Search className="h-12 w-12 text-primary animate-pulse" />
                   </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Searching for Tutors...</h2>
                  <p className="text-muted-foreground mt-2">Checking for verified experts online.</p>
                  <p className="text-sm font-mono mt-4 text-primary">{timer}s remaining</p>
                </div>
              </motion.div>
            )}

            {matchStep === 2 && (
              <motion.div
                key="peer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="relative">
                   <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                   <div className="relative bg-blue-500/10 p-6 rounded-full">
                     <Users className="h-12 w-12 text-blue-500 animate-pulse" />
                   </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Searching for Peers...</h2>
                  <p className="text-muted-foreground mt-2">Connecting with students studying {formData.subject}.</p>
                  <p className="text-sm font-mono mt-4 text-blue-500">{timer}s remaining</p>
                </div>
              </motion.div>
            )}

            {matchStep === 3 && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="relative">
                   <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                   <div className="relative bg-purple-500/10 p-6 rounded-full">
                     <Cpu className="h-12 w-12 text-purple-500 animate-pulse" />
                   </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Connecting to Mash AI</h2>
                  <p className="text-muted-foreground mt-2">Instant fallback — never wait alone.</p>
                  <p className="text-sm font-mono mt-4 text-purple-500">Initializing...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            onClick={() => {
              setIsMatching(false);
              setCurrentRequestId(null);
            }}
            className="mt-12 text-muted-foreground hover:text-destructive"
          >
            Cancel Request
          </Button>
        </Card>
      )}
    </div>
  );
}
