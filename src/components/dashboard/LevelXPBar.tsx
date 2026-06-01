"use client";

import { Trophy, Flame, Zap, Sparkles, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { TIER_CONFIG } from "@/lib/config";

const tierColors: Record<string, { bg: string; text: string; bar: string; icon: any }> = {
  BRONZE:   { bg: "from-amber-900/30 to-amber-800/10", text: "text-amber-600", bar: "bg-amber-600", icon: Trophy },
  SILVER:   { bg: "from-slate-400/30 to-slate-300/10",  text: "text-slate-400", bar: "bg-slate-400", icon: Zap },
  GOLD:     { bg: "from-yellow-500/30 to-yellow-400/10", text: "text-yellow-500", bar: "bg-yellow-500", icon: Sparkles },
  PLATINUM: { bg: "from-cyan-400/30 to-cyan-300/10",    text: "text-cyan-400",  bar: "bg-cyan-400",  icon: Crown },
  LEGEND:   { bg: "from-violet-500/30 to-violet-400/10", text: "text-violet-500", bar: "bg-violet-500", icon: Crown },
};

export default function LevelXPBar({ points = 0, streakDays = 0 }: { points: number; streakDays: number }) {
  const level = TIER_CONFIG.getLevel(points);
  const tierName = TIER_CONFIG.getTierFromPoints(points);
  const progress = TIER_CONFIG.getTierProgress(points);
  const tier = tierColors[tierName] || tierColors.BRONZE;
  const Icon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-background to-secondary/50 shadow-lg"
    >
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tier.bg} opacity-40`} />

      <div className="relative z-10 p-6 lg:p-8 space-y-5">
        {/* Top row: Level badge + Points + Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Tier icon badge */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${tier.bar} bg-opacity-20 bg-background/10`}>
              <Icon className={`h-7 w-7 ${tier.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tracking-tightest">{level}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">LEVEL</span>
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${tier.text}`}>{tierName}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight">{points.toLocaleString()}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">POINTS</p>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-black text-orange-500">{streakDays}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/70">DAY STREAK</span>
              </div>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        {progress.nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-muted-foreground/60">NEXT: {progress.nextTier}</span>
              <span className="text-muted-foreground/60">{progress.pointsForNext.toLocaleString()} XP TO GO</span>
            </div>
            <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress.progressPercent)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${tier.bar} shadow-sm`}
              />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60">
              {progress.pointsInTier.toLocaleString()} / {(progress.pointsInTier + progress.pointsForNext).toLocaleString()} XP
            </p>
          </div>
        )}

        {/* Max tier reached */}
        {!progress.nextTier && (
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-violet-500">
            <Crown className="h-4 w-4" /> Maximum tier achieved
          </div>
        )}
      </div>
    </motion.div>
  );
}
