"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  Crown,
  Loader2,
  Award,
  ChevronRight,
} from "lucide-react";
import { getUserData, getLeaderboard } from "@/app/actions/user";
import { LottieAnimation } from "@/components/lottie-animation";
import { User } from "@/generated/client";

interface Leader {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  educationLevel: string;
  tier: string;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setLoading(true);
    const user = await getUserData();
    setUserData(user);

    if (user?.educationLevel) {
      const data = await getLeaderboard(user.educationLevel);
      setLeaders(
        (data || []).map((row) => ({
          ...row,
          educationLevel: row.educationLevel ?? "",
          tier: String(row.tier),
        })),
      );
    }
    setLoading(false);
  };

  const podium = leaders.slice(0, 3);
  const others = leaders.slice(3);

  const myRank = useMemo(
    () => leaders.findIndex((l) => l.id === userData?.id) + 1,
    [leaders, userData],
  );
  const topPoints = leaders[0]?.points ?? 1;
  const myPoints = leaders.find((l) => l.id === userData?.id)?.points ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Hero — theme aware */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-700 dark:text-yellow-300">
              <Trophy className="h-3.5 w-3.5" />
              {userData?.educationLevel?.replace("_", " ")} Rankings
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tightest text-foreground">
              Climb the Ladder
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
              Compete with the best in your level. Every session, every badge,
              every helper reply — it all adds up.
            </p>
          </div>
          <div className="hidden lg:flex items-end gap-1.5">
            <MiniPodium rank={2} height={48} color="from-slate-300 to-slate-500" />
            <MiniPodium rank={1} height={72} color="from-yellow-400 to-amber-500" />
            <MiniPodium rank={3} height={36} color="from-orange-400 to-orange-600" />
          </div>
        </div>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-end pt-6">
          {podium[1] && (
            <PodiumCard
              rank={2}
              leader={podium[1]}
              topPoints={topPoints}
              isCurrentUser={podium[1].id === userData?.id}
            />
          )}
          {podium[0] && (
            <PodiumCard
              rank={1}
              leader={podium[0]}
              topPoints={topPoints}
              isCurrentUser={podium[0].id === userData?.id}
              dominant
            />
          )}
          {podium[2] && (
            <PodiumCard
              rank={3}
              leader={podium[2]}
              topPoints={topPoints}
              isCurrentUser={podium[2].id === userData?.id}
            />
          )}
        </div>
      )}

      {/* Current user rank card */}
      {userData && myRank > 0 && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 dark:from-primary/10 dark:via-card dark:to-violet-500/10 p-5 sm:p-6 shadow-lg">
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-cyan-400/15 dark:bg-cyan-400/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-lg font-black shadow-lg ring-2 ring-card">
                #{myRank}
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  Your Standing
                </p>
                <p className="text-xl font-black text-foreground">
                  {myPoints.toLocaleString()} points
                </p>
                <p className="text-xs text-muted-foreground">
                  {myRank <= 3
                    ? "Top of the podium — keep defending the crown."
                    : topPoints - myPoints > 0
                      ? `${(topPoints - myPoints).toLocaleString()} points behind the leader.`
                      : "You're at the top."}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-72">
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Progress</span>
                <span className="tabular-nums">
                  {Math.round((myPoints / Math.max(topPoints, 1)) * 100)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(myPoints / Math.max(topPoints, 1)) * 100}%`,
                  }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Others table */}
      {others.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
            <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-cyan-500" />
              The Chase
            </h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {others.length} more scholars
            </span>
          </div>
          <div className="divide-y divide-border">
            {others.map((scholar, index) => {
              const rank = index + 4;
              const isMe = scholar.id === userData?.id;
              return (
                <div
                  key={scholar.id}
                  className={`relative flex items-center justify-between p-4 sm:p-5 transition-all ${
                    isMe
                      ? "bg-gradient-to-r from-cyan-500/5 via-violet-500/5 to-transparent dark:from-cyan-500/10 dark:via-violet-500/5 border-l-4 border-primary"
                      : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="w-8 text-center font-black text-muted-foreground tabular-nums">
                      #{rank}
                    </span>
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-cyan-500/30 to-violet-500/30 shrink-0">
                      {scholar.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={scholar.avatar}
                          alt={scholar.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-foreground font-black text-sm">
                          {scholar.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      {isMe && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                        {scholar.name}
                        {isMe && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 rounded-full px-1.5 py-0.5">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {scholar.tier}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="hidden sm:block w-28 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500/70 to-violet-500/70"
                        style={{
                          width: `${(scholar.points / Math.max(topPoints, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-foreground tabular-nums">
                        {scholar.points.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                        points
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {leaders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-secondary/30 border-2 border-dashed border-border rounded-[2.5rem] text-center">
          <div className="w-44 h-44 mb-4 opacity-80">
            <LottieAnimation
              url="/animations/no-messages.json"
              ariaLabel="No leaderboard data"
            />
          </div>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            No rankings yet — be the first to claim a spot.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniPodium({
  rank,
  height,
  color,
}: {
  rank: number;
  height: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 rounded-t-lg bg-gradient-to-b ${color} flex items-center justify-center text-white text-[10px] font-black`}
        style={{ height }}
      >
        {rank === 1 ? <Crown className="h-4 w-4" /> : rank === 2 ? "2" : "3"}
      </div>
    </div>
  );
}

function PodiumCard({
  rank,
  leader,
  topPoints,
  isCurrentUser,
  dominant,
}: {
  rank: 1 | 2 | 3;
  leader: Leader;
  topPoints: number;
  isCurrentUser: boolean;
  dominant?: boolean;
}) {
  const config: Record<
    number,
    {
      ring: string;
      bg: string;
      text: string;
      border: string;
      icon: typeof Crown;
      label: string;
    }
  > = {
    1: {
      ring: "from-yellow-300 via-amber-400 to-yellow-600",
      bg: "from-yellow-500/10 via-amber-500/5 to-yellow-500/10 dark:from-yellow-500/20 dark:via-amber-500/10 dark:to-yellow-500/15",
      text: "text-yellow-600 dark:text-yellow-300",
      border: "border-yellow-500/40",
      icon: Crown,
      label: "Champion",
    },
    2: {
      ring: "from-slate-200 via-white to-slate-400",
      bg: "from-slate-300/10 via-slate-200/5 to-slate-400/10 dark:from-slate-300/15 dark:via-slate-200/5 dark:to-slate-400/10",
      text: "text-slate-700 dark:text-slate-200",
      border: "border-slate-300/40",
      icon: Medal,
      label: "Runner-Up",
    },
    3: {
      ring: "from-orange-400 via-orange-500 to-amber-600",
      bg: "from-orange-500/10 via-orange-400/5 to-orange-600/10 dark:from-orange-500/15 dark:via-orange-400/5 dark:to-orange-600/10",
      text: "text-orange-600 dark:text-orange-300",
      border: "border-orange-500/40",
      icon: Medal,
      label: "Bronze",
    },
  };

  const c = config[rank];
  const Icon = c.icon;
  const pct = (leader.points / Math.max(topPoints, 1)) * 100;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: rank * 0.1, type: "spring", stiffness: 220, damping: 18 }}
      whileHover={{ y: -6 }}
      className={`relative ${dominant ? "md:-mt-6 md:scale-105" : ""}`}
    >
      <div
        className={`relative overflow-hidden rounded-[2rem] border ${
          c.border
        } bg-gradient-to-br ${c.bg} bg-card p-6 ${
          dominant ? "shadow-2xl dark:shadow-[0_0_60px_rgba(234,179,8,0.4)]" : "shadow-xl"
        } ${isCurrentUser ? "ring-2 ring-primary/60" : ""}`}
      >
        {dominant && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.span
                key={deg}
                initial={{ rotate: deg, opacity: 0 }}
                animate={{ rotate: deg + 360, opacity: [0, 0.25, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                  delay: deg / 360,
                }}
                className="absolute h-[120vh] w-32 bg-gradient-to-b from-yellow-400/30 dark:from-yellow-400/40 via-transparent to-transparent blur-2xl"
                style={{ transformOrigin: "center" }}
              />
            ))}
          </div>
        )}

        <div className="relative flex justify-center -mt-2 mb-4">
          <motion.div
            animate={dominant ? { y: [0, -4, 0] } : undefined}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br ${
              c.ring
            } flex items-center justify-center ring-4 ring-card`}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-900" />
          </motion.div>
        </div>

        <div className="relative flex justify-center mb-3">
          <div
            className={`h-20 w-20 sm:h-24 sm:w-24 rounded-3xl overflow-hidden ring-2 ${
              c.border
            } bg-secondary shadow-lg`}
          >
            {leader.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={leader.avatar}
                alt={leader.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-foreground text-2xl font-black">
                {leader.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        <div className="relative text-center space-y-1 mb-3">
          <p className="font-black text-base sm:text-lg text-foreground truncate">
            {leader.name}
            {isCurrentUser && (
              <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 rounded-full px-1.5 py-0.5 align-middle">
                You
              </span>
            )}
          </p>
          <p className={`text-[9px] font-black uppercase tracking-widest ${c.text}`}>
            {c.label} · #{rank}
          </p>
        </div>

        <div className="relative text-center mb-3">
          <p
            className={`text-2xl sm:text-3xl font-black tracking-tightest bg-gradient-to-br ${c.ring} bg-clip-text text-transparent`}
          >
            {leader.points.toLocaleString()}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            points
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            <span>To top</span>
            <span className="tabular-nums">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.6, ease: "easeOut", delay: rank * 0.15 }}
              className={`h-full bg-gradient-to-r ${c.ring}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
