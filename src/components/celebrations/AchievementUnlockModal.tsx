"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Fireworks } from "./Fireworks";

/**
 * Full-screen achievement-unlock celebration.
 * Renders over the page with a beam, glow, badge, and a firework+ribbon shower.
 */
export function AchievementUnlockModal({
  open,
  title,
  description,
  icon,
  tier = "gold",
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  tier?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  onClose: () => void;
}) {
  const [showFx, setShowFx] = useState(false);

  useEffect(() => {
    if (open) {
      setShowFx(true);
      const t = setTimeout(() => setShowFx(false), 5500);
      return () => clearTimeout(t);
    }
  }, [open]);

  const tierStyle: Record<string, { ring: string; glow: string; bg: string; label: string; beam: string }> = {
    bronze: {
      ring: "from-orange-700 via-orange-500 to-orange-700",
      glow: "shadow-[0_0_80px_rgba(249,115,22,0.55)]",
      bg: "from-orange-500/30 via-orange-400/15 to-amber-500/20",
      label: "Bronze Honor",
      beam: "from-orange-400/40",
    },
    silver: {
      ring: "from-slate-300 via-slate-100 to-slate-400",
      glow: "shadow-[0_0_80px_rgba(203,213,225,0.6)]",
      bg: "from-slate-300/30 via-slate-200/10 to-slate-400/20",
      label: "Silver Honor",
      beam: "from-slate-200/50",
    },
    gold: {
      ring: "from-yellow-300 via-yellow-500 to-amber-600",
      glow: "shadow-[0_0_100px_rgba(234,179,8,0.7)]",
      bg: "from-yellow-500/35 via-amber-400/15 to-yellow-500/25",
      label: "Gold Honor",
      beam: "from-yellow-400/60",
    },
    platinum: {
      ring: "from-cyan-300 via-violet-400 to-cyan-300",
      glow: "shadow-[0_0_110px_rgba(139,92,246,0.7)]",
      bg: "from-cyan-400/30 via-violet-500/20 to-cyan-400/20",
      label: "Platinum Honor",
      beam: "from-violet-400/60",
    },
    diamond: {
      ring: "from-cyan-200 via-white to-cyan-300",
      glow: "shadow-[0_0_120px_rgba(165,243,252,0.8)]",
      bg: "from-cyan-300/40 via-white/20 to-cyan-300/30",
      label: "Diamond Legend",
      beam: "from-cyan-200/70",
    },
  };

  const t = tierStyle[tier];

  return (
    <>
      <Fireworks active={showFx} intensity="high" durationMs={5000} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Achievement unlocked"
          >
            {/* Rotating light beams behind badge */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <motion.span
                  key={deg}
                  initial={{ rotate: deg, opacity: 0 }}
                  animate={{ rotate: deg + 360, opacity: [0, 0.55, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear",
                    delay: deg / 360,
                  }}
                  className={`absolute h-[140vh] w-40 bg-gradient-to-b ${t.beam} via-transparent to-transparent blur-2xl`}
                  style={{ transformOrigin: "center" }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className={`relative w-full max-w-md rounded-[2.5rem] border border-white/15 bg-gradient-to-br ${t.bg} bg-zinc-950/85 backdrop-blur-2xl p-8 text-center text-white ${t.glow}`}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                {t.label}
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              {/* Badge with rotating ring + bobbing */}
              <div className="relative mx-auto h-44 w-44 mb-6">
                <motion.div
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${t.ring}`}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-2 rounded-full bg-zinc-950 flex items-center justify-center"
                >
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${t.ring} opacity-50 blur-2xl`} />
                  {icon ? (
                    <div className="relative text-white">{icon}</div>
                  ) : (
                    <Trophy className="relative h-20 w-20 text-white" />
                  )}
                </motion.div>
                {/* Star burst dots */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <motion.span
                    key={deg}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.4,
                      delay: 0.4 + deg / 720,
                      repeat: Infinity,
                    }}
                    className="absolute h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: `rotate(${deg}deg) translateY(-90px)`,
                      transformOrigin: "0 0",
                    }}
                  />
                ))}
              </div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-black tracking-tight mb-2"
              >
                {title}
              </motion.h2>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-sm text-white/70 leading-relaxed"
              >
                {description}
              </motion.p>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-2 mt-8"
              >
                <Button
                  onClick={onClose}
                  className="flex-1 h-12 rounded-2xl bg-white text-zinc-950 font-black text-[10px] uppercase tracking-widest hover:bg-white/90"
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl bg-white/10 text-white border-white/15 font-black text-[10px] uppercase tracking-widest hover:bg-white/20"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
