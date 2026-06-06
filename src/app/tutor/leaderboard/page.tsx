"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Award,
  ChevronRight,
  GraduationCap,
  Star,
  CheckCircle2,
} from "lucide-react";
import { getUserData } from "@/app/actions/user";
import { getTutorLeaderboard } from "@/app/actions/tutor";
import { LottieAnimation } from "@/components/lottie-animation";

interface TutorLeader {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  county: string | null;
  tutorProfile: {
    subjects: string[];
    rating: number;
    totalSessions: number;
    responseRate: number;
  } | null;
}

export default function TutorLeaderboardPage() {
  const [leaders, setLeaders] = useState<TutorLeader[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [me, data] = await Promise.all([
        getUserData(),
        getTutorLeaderboard(20),
      ]);
      if (cancelled) return;
      setUserId(me?.id ?? null);
      setLeaders((data as unknown as TutorLeader[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const podium = leaders.slice(0, 3);
  const others = leaders.slice(3);
  const topRating = leaders[0]?.tutorProfile?.rating ?? 5;

  const myRank = useMemo(
    () => leaders.findIndex((l) => l.id === userId) + 1,
    [leaders, userId],
  );
  const myEntry = leaders.find((l) => l.id === userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 blur-[120px]" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              <GraduationCap className="h-3.5 w-3.5" />
              Verified Tutor Rankings
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tightest text-foreground">
              Top Mentors in the Hall
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
              Ranked by student ratings and total sessions taught. The higher
              you climb, the more students find you first.
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
              topRating={topRating}
              isCurrentUser={podium[1].id === userId}
            />
          )}
          {podium[0] && (
            <PodiumCard
              rank={1}
              leader={podium[0]}
              topRating={topRating}
              isCurrentUser={podium[0].id === userId}
              dominant
            />
          )}
          {podium[2] && (
            <PodiumCard
              rank={3}
              leader={podium[2]}
              topRating={topRating}
              isCurrentUser={podium[2].id === userId}
            />
          )}
        </div>
      )}

      {/* Current user rank card */}
      {userId && myRank > 0 && myEntry && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-cyan-500/5 dark:from-primary/10 dark:via-card dark:to-cyan-500/10 p-5 sm:p-6 shadow-lg">
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
                <p className="text-xl font-black text-foreground flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  {(myEntry.tutorProfile?.rating ?? 0).toFixed(1)} rating
                </p>
                <p className="text-xs text-muted-foreground">
                  {myEntry.tutorProfile?.totalSessions ?? 0} sessions completed
                  {myRank > 1
                    ? ` · ${(leaders[0]?.tutorProfile?.rating ?? 0) - (myEntry.tutorProfile?.rating ?? 0) > 0 ? `${((leaders[0]?.tutorProfile?.rating ?? 0) - (myEntry.tutorProfile?.rating ?? 0)).toFixed(2)} stars behind #1` : "Tied for the lead"}`
                    : "You're #1."}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-72">
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Rating vs leader</span>
                <span className="tabular-nums">
                  {Math.round(((myEntry.tutorProfile?.rating ?? 0) / Math.max(topRating, 0.01)) * 100)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((myEntry.tutorProfile?.rating ?? 0) / Math.max(topRating, 0.01)) * 100}%`,
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
              The Field
            </h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {others.length} more tutors
            </span>
          </div>
          <div className="divide-y divide-border">
            {others.map((leader, index) => {
              const rank = index + 4;
              const isMe = leader.id === userId;
              const rating = leader.tutorProfile?.rating ?? 0;
              return (
                <div
                  key={leader.id}
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
                      {leader.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={leader.avatar}
                          alt={leader.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-foreground font-black text-sm">
                          {leader.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      {isMe && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                        {leader.name}
                        {isMe && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 rounded-full px-1.5 py-0.5">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter truncate">
                        {leader.tutorProfile?.subjects?.[0] ?? "Tutor"}
                        {leader.county ? ` · ${leader.county}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="hidden sm:block w-28 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500/70 to-violet-500/70"
                        style={{
                          width: `${(rating / Math.max(topRating, 0.01)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-foreground tabular-nums flex items-center gap-1 justify-end">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {rating.toFixed(1)}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                        {leader.tutorProfile?.totalSessions ?? 0} sessions
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

function MiniPodium({ rank, height, color }: { rank: number; height: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-black text-foreground">#{rank}</div>
      <div className={`w-12 mt-1 rounded-t-lg bg-gradient-to-b ${color}`} style={{ height }} />
    </div>
  );
}

interface PodiumCardProps {
  rank: number;
  leader: TutorLeader;
  topRating: number;
  isCurrentUser: boolean;
  dominant?: boolean;
}

function PodiumCard({ rank, leader, topRating, isCurrentUser, dominant = false }: PodiumCardProps) {
  const rating = leader.tutorProfile?.rating ?? 0;
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-card shadow-lg p-5 sm:p-6 ${
        dominant
          ? "border-yellow-500/40 dark:border-yellow-500/30 shadow-yellow-500/10"
          : "border-border"
      }`}
    >
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl ${
          rank === 1
            ? "bg-yellow-400/20"
            : rank === 2
              ? "bg-slate-300/20"
              : "bg-orange-400/20"
        }`}
      />
      <div className="relative flex flex-col items-center text-center space-y-3">
        <div
          className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden ring-2 ring-border bg-gradient-to-br from-cyan-500/30 to-violet-500/30 ${
            dominant ? "ring-yellow-500/50" : ""
          }`}
        >
          {leader.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leader.avatar} alt={leader.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-foreground font-black text-2xl">
              {leader.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div>
          <p className="font-black text-foreground truncate flex items-center justify-center gap-1.5">
            {leader.name}
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
            {leader.tutorProfile?.subjects?.[0] ?? "Tutor"}
          </p>
        </div>
        <div
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
            rank === 1
              ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
              : rank === 2
                ? "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                : "bg-orange-500/15 text-orange-700 dark:text-orange-300"
          }`}
        >
          {rank === 1 ? "Gold Mentor" : rank === 2 ? "Silver Mentor" : "Bronze Mentor"}
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            {rating.toFixed(1)}
          </span>
          <span className="text-muted-foreground">
            {leader.tutorProfile?.totalSessions ?? 0} sessions
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full ${
              rank === 1
                ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                : rank === 2
                  ? "bg-gradient-to-r from-slate-300 to-slate-500"
                  : "bg-gradient-to-r from-orange-400 to-orange-600"
            }`}
            style={{ width: `${(rating / Math.max(topRating, 0.01)) * 100}%` }}
          />
        </div>
        {isCurrentUser && (
          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 rounded-full px-2 py-0.5">
            That&apos;s you
          </span>
        )}
      </div>
    </div>
  );
}
