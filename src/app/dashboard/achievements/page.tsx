"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Zap,
  Flame,
  GraduationCap,
  Loader2,
  Award,
  ShieldCheck,
  Target,
  Lock,
  Sparkles,
  Rocket,
  Crown,
  Medal,
  Gem,
  CheckCircle2,
} from "lucide-react";
import {
  getAchievements,
  checkAndAwardAchievements,
} from "@/app/actions/achievements";
import { showError, showSuccess } from "@/lib/toast";
import { AchievementUnlockModal } from "@/components/celebrations/AchievementUnlockModal";
import { Fireworks } from "@/components/celebrations/Fireworks";
import { LottieAnimation } from "@/components/lottie-animation";
import { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  GraduationCap,
  Flame,
  Trophy,
  Star,
  Award,
  ShieldCheck,
  Target,
  Rocket,
  Crown,
  Medal,
  Gem,
  Sparkles,
};

type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

// ─── Celebration rate limiter ────────────────────────────────────────────────
// The full unlock celebration (fireworks + modal) can fire at most twice per
// rolling 24h window per browser. Subsequent unlocks still earn the achievement
// and show a toast, but the big screen takeover is suppressed so it doesn't
// become noise if the user unlocks several in a row.
const CELEBRATION_STORAGE_KEY = "edyfra.celebration.timestamps";
const CELEBRATION_MAX_PER_DAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

function getRecentCelebrationTimestamps(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CELEBRATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - DAY_MS;
    return parsed.filter((t: unknown) => typeof t === "number" && t > cutoff);
  } catch {
    return [];
  }
}

function recordCelebrationTimestamp(): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentCelebrationTimestamps();
    recent.push(Date.now());
    window.localStorage.setItem(
      CELEBRATION_STORAGE_KEY,
      JSON.stringify(recent),
    );
  } catch {
    // localStorage may be disabled (private mode) — silently skip
  }
}

function canShowCelebration(): boolean {
  return getRecentCelebrationTimestamps().length < CELEBRATION_MAX_PER_DAY;
}

type Achievement = {
  id: string;
  userId: string;
  type: string;
  icon: string;
  title: string;
  description: string;
  unlockedAt: Date | string;
};

const ALL_ACHIEVEMENTS: Array<{
  type: string;
  title: string;
  description: string;
  icon: string;
  tier: Tier;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  xp: number;
}> = [
  {
    type: "FIRST_MATCH",
    title: "First Step to Success",
    description: "Completed your first study session.",
    icon: "Zap",
    tier: "bronze",
    rarity: "Common",
    xp: 50,
  },
  {
    type: "SESSIONS_5",
    title: "Dedicated Scholar",
    description: "Completed 5 study sessions — momentum is real.",
    icon: "GraduationCap",
    tier: "silver",
    rarity: "Common",
    xp: 150,
  },
  {
    type: "SESSIONS_25",
    title: "On Fire",
    description: "25 sessions deep. Habit unlocked.",
    icon: "Flame",
    tier: "gold",
    rarity: "Rare",
    xp: 500,
  },
  {
    type: "FIRST_CHALLENGE",
    title: "Daily Warrior",
    description: "Completed your first daily quest.",
    icon: "Trophy",
    tier: "silver",
    rarity: "Common",
    xp: 200,
  },
  {
    type: "STREAK_7",
    title: "Week-Long Streak",
    description: "Seven days in a row. Consistency is your superpower.",
    icon: "Star",
    tier: "gold",
    rarity: "Rare",
    xp: 600,
  },
  {
    type: "STREAK_30",
    title: "Unstoppable",
    description: "30-day streak. You're a force of nature.",
    icon: "ShieldCheck",
    tier: "platinum",
    rarity: "Epic",
    xp: 2000,
  },
  {
    type: "TOP_3_LEADERBOARD",
    title: "Podium Finisher",
    description: "Finished in the top 3 of your education level.",
    icon: "Crown",
    tier: "platinum",
    rarity: "Epic",
    xp: 1500,
  },
  {
    type: "TOP_1_LEADERBOARD",
    title: "Top Scholar",
    description: "#1 on the leaderboard. The throne is yours.",
    icon: "Crown",
    tier: "diamond",
    rarity: "Legendary",
    xp: 5000,
  },
  {
    type: "HELPER",
    title: "Knowledge Sharer",
    description: "Helped 10 other students in the forums.",
    icon: "Award",
    tier: "gold",
    rarity: "Rare",
    xp: 800,
  },
  {
    type: "MENTOR",
    title: "Mentor",
    description: "Tutored 25 sessions as a verified tutor.",
    icon: "GraduationCap",
    tier: "platinum",
    rarity: "Epic",
    xp: 2500,
  },
  {
    type: "PERFECT_SESSION",
    title: "Flawless",
    description: "Completed a session with perfect attendance + rating.",
    icon: "Target",
    tier: "silver",
    rarity: "Common",
    xp: 300,
  },
  {
    type: "LEGEND",
    title: "Edyfra Legend",
    description: "Everything maxed. The rarest of the rare.",
    icon: "Gem",
    tier: "diamond",
    rarity: "Legendary",
    xp: 10000,
  },
];

const TIER_STYLES: Record<
  Tier,
  {
    label: string;
    ring: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  bronze: {
    label: "Bronze",
    ring: "from-orange-700 via-orange-500 to-amber-700",
    bg: "from-orange-500/10 to-amber-600/5 dark:from-orange-500/20 dark:to-amber-600/10",
    text: "text-orange-600 dark:text-orange-300",
    border: "border-orange-500/30",
  },
  silver: {
    label: "Silver",
    ring: "from-slate-300 via-white to-slate-400",
    bg: "from-slate-300/10 to-slate-500/5 dark:from-slate-300/20 dark:to-slate-500/10",
    text: "text-slate-700 dark:text-slate-200",
    border: "border-slate-300/30",
  },
  gold: {
    label: "Gold",
    ring: "from-yellow-300 via-amber-400 to-yellow-600",
    bg: "from-yellow-400/10 to-amber-500/5 dark:from-yellow-400/20 dark:to-amber-500/10",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-500/30",
  },
  platinum: {
    label: "Platinum",
    ring: "from-cyan-300 via-violet-400 to-cyan-300",
    bg: "from-cyan-400/10 to-violet-500/8 dark:from-cyan-400/20 dark:to-violet-500/15",
    text: "text-violet-600 dark:text-violet-300",
    border: "border-violet-400/30",
  },
  diamond: {
    label: "Diamond",
    ring: "from-cyan-200 via-white to-cyan-300",
    bg: "from-cyan-300/15 via-white/5 to-cyan-300/15 dark:from-cyan-300/30 dark:via-white/15 dark:to-cyan-300/25",
    text: "text-cyan-700 dark:text-cyan-200",
    border: "border-cyan-300/40",
  },
};

const RARITY_STYLES: Record<string, string> = {
  Common: "bg-secondary text-muted-foreground border-border",
  Rare: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30",
  Epic: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30",
  Legendary:
    "bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-cyan-500/15 text-amber-700 dark:text-amber-200 border-amber-400/40",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<typeof ALL_ACHIEVEMENTS[number] | null>(null);
  const [showFx, setShowFx] = useState(false);
  const seenTypes = useRef<Set<string>>(new Set());

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await checkAndAwardAchievements();
      const data = await getAchievements();
      const list = (data as Achievement[]).map((a) => ({
        ...a,
        unlockedAt: a.unlockedAt,
      }));
      setAchievements(list);
      const newlyUnlocked: Achievement[] = [];
      for (const a of list) {
        if (!seenTypes.current.has(a.type)) {
          seenTypes.current.add(a.type);
          const ageMs = Date.now() - new Date(a.unlockedAt).getTime();
          if (ageMs < 60_000) {
            newlyUnlocked.push(a);
          }
        }
      }
      if (newlyUnlocked.length > 0) {
        const first = newlyUnlocked[0];
        const meta = ALL_ACHIEVEMENTS.find((m) => m.type === first.type);
        if (meta) {
          setUnlockTarget(meta);
          if (canShowCelebration()) {
            recordCelebrationTimestamp();
            setShowUnlockModal(true);
            setShowFx(true);
          } else {
            // Already celebrated twice today — silent unlock + tiny toast
            showSuccess(`Unlocked: ${meta.title}`, {
              description: "Full celebration paused — come back tomorrow!",
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      showError({
        title: "We couldn't load your honors",
        cause: "A hiccup on our side blocked the load.",
        fix: "Refresh the page and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const unlockedSet = useMemo(
    () => new Set(achievements.map((a) => a.type)),
    [achievements],
  );

  const merged = useMemo(() => {
    return ALL_ACHIEVEMENTS.map((m) => {
      const earned = achievements.find((a) => a.type === m.type);
      return {
        ...m,
        unlockedAt: earned?.unlockedAt,
        isUnlocked: !!earned,
      };
    });
  }, [achievements]);

  const filtered = useMemo(() => {
    return merged.filter((a) => {
      if (filter === "unlocked" && !a.isUnlocked) return false;
      if (filter === "locked" && a.isUnlocked) return false;
      if (tierFilter !== "all" && a.tier !== tierFilter) return false;
      return true;
    });
  }, [merged, filter, tierFilter]);

  const stats = useMemo(() => {
    const total = ALL_ACHIEVEMENTS.length;
    const unlocked = merged.filter((a) => a.isUnlocked).length;
    const totalXp = merged
      .filter((a) => a.isUnlocked)
      .reduce((s, a) => s + a.xp, 0);
    const byTier = ALL_ACHIEVEMENTS.reduce<Record<Tier, { earned: number; total: number }>>(
      (acc, a) => {
        if (!acc[a.tier]) acc[a.tier] = { earned: 0, total: 0 };
        acc[a.tier].total += 1;
        if (unlockedSet.has(a.type)) acc[a.tier].earned += 1;
        return acc;
      },
      {} as Record<Tier, { earned: number; total: number }>,
    );
    const completion = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, totalXp, byTier, completion };
  }, [merged, unlockedSet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Hero / stat card — theme aware */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-700 dark:text-yellow-300">
              <Trophy className="h-3.5 w-3.5" />
              Honors Hall
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tightest text-foreground">
              Your Achievements
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
              Every badge tells a story. Earn XP, climb tiers, and unlock rare
              honors as you build momentum.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto">
            <StatPill
              label="Unlocked"
              value={`${stats.unlocked}/${stats.total}`}
              sub={`${stats.completion}%`}
              gradient="from-cyan-500 to-blue-500"
            />
            <StatPill
              label="Total XP"
              value={stats.totalXp.toLocaleString()}
              sub="earned"
              gradient="from-yellow-400 to-amber-500"
            />
            <StatPill
              label="Rarest"
              value={
                merged.find((a) => a.isUnlocked && a.tier === "diamond")
                  ? "Diamond"
                  : merged.find((a) => a.isUnlocked && a.tier === "platinum")
                    ? "Platinum"
                    : merged.find((a) => a.isUnlocked && a.tier === "gold")
                      ? "Gold"
                      : merged.find((a) => a.isUnlocked && a.tier === "silver")
                        ? "Silver"
                        : merged.find((a) => a.isUnlocked)
                          ? "Bronze"
                          : "—"
              }
              sub="tier"
              gradient="from-violet-500 to-fuchsia-500"
            />
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["bronze", "silver", "gold", "platinum", "diamond"] as Tier[]).map(
            (t) => {
              const s = stats.byTier[t] || { earned: 0, total: 0 };
              const pct = s.total > 0 ? (s.earned / s.total) * 100 : 0;
              const ts = TIER_STYLES[t];
              return (
                <div
                  key={t}
                  className={`rounded-2xl border ${ts.border} bg-card/60 p-3`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${ts.text}`}>
                      {ts.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                      {s.earned}/{s.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${ts.ring}`}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-[10px] font-black uppercase tracking-widest">
          {[
            { k: "all", label: `All (${merged.length})` },
            { k: "unlocked", label: `Unlocked (${stats.unlocked})` },
            { k: "locked", label: `Locked (${stats.total - stats.unlocked})` },
          ].map((b) => (
            <button
              key={b.k}
              onClick={() => setFilter(b.k as any)}
              className={`px-4 py-1.5 rounded-full transition-all ${
                filter === b.k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "bronze", "silver", "gold", "platinum", "diamond"] as const).map(
            (t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t as any)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                  tierFilter === t
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/50"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Achievement grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-secondary/30 border-2 border-dashed border-border rounded-[2.5rem] text-center">
          <div className="w-44 h-44 mb-4 opacity-80">
            <LottieAnimation
              url="/animations/no-messages.json"
              ariaLabel="No achievements in this view"
            />
          </div>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            Nothing here yet — switch filters or keep studying.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((a, i) => (
            <AchievementCard key={a.type} a={a} index={i} />
          ))}
        </div>
      )}

      {unlockTarget && (
        <AchievementUnlockModal
          open={showUnlockModal}
          title={unlockTarget.title}
          description={unlockTarget.description}
          tier={unlockTarget.tier}
          icon={
            (() => {
              const Icon = ICON_MAP[unlockTarget.icon] || Award;
              return <Icon className="h-20 w-20" />;
            })()
          }
          onClose={() => {
            setShowUnlockModal(false);
            setShowFx(false);
          }}
        />
      )}
      <Fireworks
        active={showFx}
        intensity="high"
        durationMs={5000}
        onComplete={() => setShowFx(false)}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  sub,
  gradient,
}: {
  label: string;
  value: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 sm:p-4 backdrop-blur-md min-w-[100px] shadow-sm">
      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div
        className={`text-xl sm:text-2xl font-black bg-gradient-to-br ${gradient} bg-clip-text text-transparent leading-none`}
      >
        {value}
      </div>
      <div className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
        {sub}
      </div>
    </div>
  );
}

function AchievementCard({ a, index }: { a: any; index: number }) {
  const Icon = ICON_MAP[a.icon] || Award;
  const ts = TIER_STYLES[a.tier as Tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`group relative overflow-hidden rounded-3xl border ${
        a.isUnlocked ? ts.border : "border-border"
      } bg-card ${a.isUnlocked ? "shadow-xl dark:shadow-[0_0_30px_rgba(0,0,0,0.15)]" : "shadow-sm"} p-6 transition-all`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
          a.isUnlocked ? ts.bg : "from-transparent to-transparent"
        } opacity-60`}
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[9px] font-black uppercase tracking-widest ${ts.text}`}>
            {ts.label}
          </span>
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${RARITY_STYLES[a.rarity]}`}
          >
            {a.rarity}
          </span>
        </div>

        <div className="relative mx-auto h-24 w-24 my-3">
          {a.isUnlocked ? (
            <>
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${ts.ring}`}
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-1.5 rounded-full bg-card flex items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${ts.ring} opacity-30 blur-xl`}
                />
                <Icon
                  className={`relative h-10 w-10 ${ts.text} group-hover:scale-110 transition-transform`}
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 rounded-full bg-secondary border border-dashed border-border flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="text-center space-y-1.5 flex-1">
          <h3
            className={`text-base font-black tracking-tight ${
              a.isUnlocked ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {a.title}
          </h3>
          <p
            className={`text-[11px] leading-relaxed font-medium ${
              a.isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
            }`}
          >
            {a.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            +{a.xp} XP
          </span>
          {a.isUnlocked ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {new Date(a.unlockedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
