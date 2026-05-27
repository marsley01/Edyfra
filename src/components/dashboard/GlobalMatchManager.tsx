"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Loader2, Quote, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { cancelMatchRequest, checkMatchStatus, forceAIFallback, retryMatchRequest } from "@/app/actions/match";
import { useMatchStore } from "@/store/matchStore";

const MATCH_QUOTES = [
  "\"Education is the most powerful weapon which you can use to change the world.\" - Nelson Mandela",
  "\"The beautiful thing about learning is that no one can take it away from you.\" - B.B. King",
  "\"Live as if you were to die tomorrow. Learn as if you were to live forever.\" - Mahatma Gandhi",
  "\"An investment in knowledge pays the best interest.\" - Benjamin Franklin",
  "\"The only person who is educated is the one who has learned how to learn and change.\" - Carl Rogers",
];

export function GlobalMatchManager() {
  const router = useRouter();
  const supabase = createClient();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const humanRetryRef = useRef<NodeJS.Timeout | null>(null);
  const {
    aiFallbackTriggered,
    currentRequestId,
    decrementTimer,
    formData,
    isMatching,
    matchStep,
    quoteIndex,
    reset,
    setAiFallbackTriggered,
    setMatchStep,
    setQuoteIndex,
    timer,
  } = useMatchStore();

  useEffect(() => {
    if (!isMatching) return;

    const timerRef = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(timerRef);
  }, [decrementTimer, isMatching]);

  useEffect(() => {
    if (!isMatching) return;

    const quoteTimer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MATCH_QUOTES.length);
    }, 5000);

    return () => clearInterval(quoteTimer);
  }, [isMatching, setQuoteIndex]);

  useEffect(() => {
    if (!isMatching || !currentRequestId) return;

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
        (payload: { new: { sessionId?: string | null } }) => {
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
        if (humanRetryRef.current) clearInterval(humanRetryRef.current);
        toast.success("Connection established! Entering room...");
        reset();
        router.push(`/study-room/${res.sessionId}`);
      }
    }, 3000);

    humanRetryRef.current = setInterval(async () => {
      const res = await retryMatchRequest(currentRequestId);
      if (res.success && res.sessionId) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (humanRetryRef.current) clearInterval(humanRetryRef.current);
        toast.success(res.tier === "PEER" ? "Study partner found!" : "Tutor found!");
        reset();
        router.push(`/study-room/${res.sessionId}`);
      }
    }, 8000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (humanRetryRef.current) clearInterval(humanRetryRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentRequestId, isMatching, reset, router, supabase]);

  useEffect(() => {
    if (!isMatching || !currentRequestId) return;

    if (timer === 60 && matchStep === 1) {
      setMatchStep(2);
    }
    if (timer === 30 && matchStep === 2) {
      setMatchStep(3);
    }
    if (timer === 0 && !aiFallbackTriggered) {
      setAiFallbackTriggered(true);
      forceAIFallback(currentRequestId)
        .then((result) => {
          if (result.success) {
            toast.info("Connecting you to Mash AI...");
            reset();
            router.push(`/study-room/${result.sessionId}`);
          }
        })
        .catch(() => {
          toast.error("AI fallback failed.");
          reset();
        });
    }
  }, [aiFallbackTriggered, currentRequestId, isMatching, matchStep, reset, router, setAiFallbackTriggered, setMatchStep, timer]);

  if (!isMatching) return null;

  const title =
    matchStep === 1
      ? "Finding a tutor"
      : matchStep === 2
        ? "Finding a study partner"
        : "Keeping Mash AI ready";

  const subtitle =
    matchStep === 1
      ? `Looking for the best tutor for ${formData.subject}.`
      : matchStep === 2
        ? `Scanning for a peer who can help with ${formData.subject}.`
        : `No human yet. Mash AI is ready if needed.`;

  return (
    <div className="fixed top-4 left-1/2 z-[100] w-full max-w-xl -translate-x-1/2 px-4">
      <AnimatePresence>
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.96 }}
          className="pointer-events-auto rounded-[2rem] border border-white/10 bg-black/90 p-3 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5">
              <Loader2 className="absolute h-8 w-8 animate-spin text-primary/50" />
              {matchStep === 1 && <Search className="h-4 w-4 text-primary" />}
              {matchStep === 2 && <Users className="h-4 w-4 text-blue-400" />}
              {matchStep === 3 && <Cpu className="h-4 w-4 text-emerald-400" />}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">{title}</p>
                  <p className="text-xs text-white/60">{subtitle}</p>
                </div>
                <button
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
                  className="rounded-full bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cancel matching"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${(timer / 90) * 100}%` }}
                />
              </div>

              <div className="flex items-start gap-2 rounded-2xl bg-white/5 px-3 py-2">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
                <p className="text-xs leading-relaxed text-white/75">{MATCH_QUOTES[quoteIndex]}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">
                  {timer}s remaining
                </p>
                <p className="text-[11px] font-medium text-white/55">
                  You can keep browsing the dashboard while we search.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
