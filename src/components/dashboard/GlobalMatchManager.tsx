"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { forceAIFallback, checkMatchStatus } from "@/app/actions/match";
import { useMatchStore } from "@/store/matchStore";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Users, Cpu, X } from "lucide-react";

export function GlobalMatchManager() {
  const { 
    isMatching, matchStep, timer, currentRequestId, aiFallbackTriggered,
    setMatchStep, decrementTimer, setAiFallbackTriggered, reset 
  } = useMatchStore();
  
  const router = useRouter();
  const supabase = createClient();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer logic
  useEffect(() => {
    if (!isMatching) return;
    
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMatching, decrementTimer]);

  // Step progression
  useEffect(() => {
    if (!isMatching) return;
    
    if (timer === 60 && matchStep === 1) {
      setMatchStep(2);
    }
    if (timer === 30 && matchStep === 2) {
      setMatchStep(3);
    }
    if (timer === 0 && !aiFallbackTriggered && currentRequestId) {
      setAiFallbackTriggered(true);
      handleAIFallback(currentRequestId);
    }
  }, [timer, isMatching, matchStep, aiFallbackTriggered, currentRequestId, setMatchStep, setAiFallbackTriggered]);

  const handleAIFallback = async (reqId: string) => {
    setMatchStep(3);
    try {
      const result = await forceAIFallback(reqId);
      if (result.success) {
        toast.info("Connecting you to Mash AI...");
        reset();
        router.push(`/study-room/${result.sessionId}`);
      }
    } catch {
      toast.error("AI fallback failed.");
      reset();
    }
  };

  // Realtime updates & polling
  useEffect(() => {
    if (!currentRequestId || !isMatching) return;

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
        (payload: any) => {
          if (payload.new?.sessionId) {
            toast.success("Match found! Redirecting...");
            reset();
            router.push(`/study-room/${payload.new.sessionId}`);
          }
        }
      )
      .subscribe();

    pollingRef.current = setInterval(async () => {
      const res = await checkMatchStatus(currentRequestId);
      if (res.success && res.sessionId) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        toast.success("Connection established! Entering room...");
        reset();
        router.push(`/study-room/${res.sessionId}`);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentRequestId, isMatching, router, supabase, reset]);

  if (!isMatching) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
      <AnimatePresence>
        <motion.div 
          initial={{ y: -50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.9 }}
          className="bg-black/90 backdrop-blur-xl text-white shadow-2xl rounded-full p-2 flex items-center justify-between gap-4 pointer-events-auto border border-white/10"
        >
          <div className="flex items-center gap-3 pl-2">
            <div className="relative flex items-center justify-center h-8 w-8">
              <Loader2 className="absolute inset-0 h-full w-full animate-spin text-primary/50" />
              {matchStep === 1 && <Search className="h-4 w-4 text-primary" />}
              {matchStep === 2 && <Users className="h-4 w-4 text-blue-400" />}
              {matchStep === 3 && <Cpu className="h-4 w-4 text-emerald-400" />}
            </div>
            <div className="flex flex-col min-w-[150px]">
              <span className="text-sm font-bold truncate">
                {matchStep === 1 && "Finding Tutor..."}
                {matchStep === 2 && "Finding Study Partner..."}
                {matchStep === 3 && "Mash AI is stepping in..."}
              </span>
              <span className="text-[10px] text-white/50 font-medium">
                {timer} seconds remaining
              </span>
            </div>
          </div>
          <button 
            onClick={() => reset()}
            className="h-8 w-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors mr-1 shrink-0"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
