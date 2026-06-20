"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Cpu, Users, Search, Zap, ExternalLink } from "lucide-react";
import { useMatch } from "@/lib/match-context";
import Link from "next/link";

const STEP_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  tutor: { label: "Finding a tutor...", icon: Search, color: "text-white" },
  peer: { label: "Looking for a study partner...", icon: Users, color: "text-blue-500" },
  ai: { label: "Connecting to Mash AI...", icon: Cpu, color: "text-emerald-500" },
  matched: { label: "Match found!", icon: Zap, color: "text-emerald-500" },
};

export default function MatchFloatingBar() {
  const { step, timer, cancelMatch } = useMatch();

  if (step === "idle") return null;

  const config = STEP_CONFIG[step];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          className="bg-black border border-white/10 rounded-full shadow-2xl shadow-white/5 overflow-hidden group"
        >
          <div className="flex items-center gap-3 px-5 py-3 min-w-[200px]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Icon className={`h-5 w-5 ${config.color}`} />
                {step !== "matched" && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="text-sm font-bold text-white whitespace-nowrap">{config.label}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-neutral-400 tabular-nums">{timer}s</span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Link
                  href="/dashboard/study"
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => cancelMatch()}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
