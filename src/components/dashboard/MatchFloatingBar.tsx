"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Cpu, Users, Search, Zap, ExternalLink, Quote } from "lucide-react";
import { useMatch } from "@/lib/match-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const QUOTES = [
  "\"Education is the most powerful weapon which you can use to change the world.\" — Nelson Mandela",
  "\"The beautiful thing about learning is that nobody can take it away from you.\" — B.B. King",
  "\"Education is not preparation for life; education is life itself.\" — John Dewey",
  "\"The more that you read, the more things you will know. The more that you learn, the more places you'll go.\" — Dr. Seuss",
  "\"Intelligence plus character — that is the goal of true education.\" — Martin Luther King Jr.",
  "\"Learning never exhausts the mind.\" — Leonardo da Vinci",
  "\"The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.\" — Brian Herbert",
  "\"Education is the passport to the future, for tomorrow belongs to those who prepare for it today.\" — Malcolm X",
  "\"Tell me and I forget. Teach me and I remember. Involve me and I learn.\" — Benjamin Franklin",
  "\"The mind is not a vessel to be filled, but a fire to be kindled.\" — Plutarch",
  "\"Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.\" — Richard Feynman",
  "\"The expert in anything was once a beginner.\" — Helen Hayes",
  "\"The only person who is educated is the one who has learned how to learn and change.\" — Carl Rogers",
  "\"Learning is not attained by chance, it must be sought for with ardor and diligence.\" — Abigail Adams",
  "\"Knowledge will bring you the opportunity to make a difference.\" — Claire Fagin",
];

const STEP_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  tutor: { label: "Finding a tutor...", icon: Search, color: "text-primary" },
  peer: { label: "Looking for a study partner...", icon: Users, color: "text-blue-500" },
  ai: { label: "Connecting to Mash AI...", icon: Cpu, color: "text-emerald-500" },
  matched: { label: "Match found!", icon: Zap, color: "text-emerald-500" },
};

export default function MatchFloatingBar() {
  const { step, timer, matchRequestId, cancelMatch } = useMatch();
  const [expanded, setExpanded] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  const nextQuote = useCallback(() => {
    setQuoteVisible(false);
    setTimeout(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
      setQuoteVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    if (step === "matched" || step === "idle") return;
    const interval = setInterval(nextQuote, 5000);
    return () => clearInterval(interval);
  }, [step, nextQuote]);

  if (step === "idle") return null;

  const config = STEP_CONFIG[step];
  if (!config) return null;

  const Icon = config.icon;
  const progressPercent = ((60 - timer) / 60) * 100;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          className="bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/10 rounded-full overflow-hidden"
        >
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-3 px-5 py-3 min-w-[200px] cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${config.color}`} />
                {step !== "matched" && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{config.label}</span>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{timer}s</span>
              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </button>
          ) : (
            <div className="p-5 min-w-[280px] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    {step !== "matched" && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-bold">{config.label}</p>
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">
                      {step === "ai" ? "Almost there..." : `Auto-connecting in ${timer}s`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                >
                  <ChevronDownIcon />
                </button>
              </div>

              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {step !== "matched" && (
                <div className="relative h-10 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {quoteVisible && (
                      <motion.p
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs text-muted-foreground/80 italic text-center leading-relaxed flex items-start gap-1.5 px-2"
                      >
                        <Quote className="h-3 w-3 shrink-0 mt-0.5 text-primary/40" />
                        {QUOTES[quoteIndex]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${step === "tutor" ? "bg-primary" : step === "peer" ? "bg-blue-500" : step === "ai" ? "bg-emerald-500" : "bg-muted"}`} />
                    Tutor
                  </span>
                  <span className="text-muted-foreground/40">&rarr;</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${step === "peer" ? "bg-blue-500" : step === "ai" ? "bg-emerald-500" : "bg-muted"}`} />
                    Peer
                  </span>
                  <span className="text-muted-foreground/40">&rarr;</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${step === "ai" || step === "matched" ? "bg-emerald-500" : "bg-muted"}`} />
                    AI
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link href="/dashboard/study">
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 rounded-full">
                      <ExternalLink className="h-3 w-3" /> View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                    onClick={() => { cancelMatch(); setExpanded(false); }}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
