"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  MessageCircle,
  UserCheck,
  UserPlus,
  Calendar,
  Zap,
  Flame,
  Trophy,
  GraduationCap,
  BookOpen,
  Heart,
  MessageSquare,
  Settings,
  BadgeCheck,
  Sparkles,
  Loader2,
  X,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BlobDecor } from "@/components/ui/blob-decor";
import { MiniBlobs } from "@/components/ui/mini-blobs";
import {
  connectWithUser,
  getFollowList,
  type ProfileData,
  type ViewerContext,
} from "@/app/actions/profile";
import { toggleFollow } from "@/app/actions/social";
import { showError, showSuccess } from "@/lib/toast";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "from-amber-700 to-orange-600",
  SILVER: "from-slate-400 to-zinc-500",
  GOLD: "from-yellow-400 to-amber-500",
  DIAMOND: "from-cyan-400 to-blue-500",
};

type FollowUser = { id: string; name: string; avatar: string | null; tier: string };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ProfileView({
  profile,
  viewer,
}: {
  profile: ProfileData;
  viewer: ViewerContext;
}) {
  const [following, setFollowing] = useState(viewer.isFollowing);
  const [pending, startTransition] = useTransition();
  const [connecting, setConnecting] = useState(false);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followUsers, setFollowUsers] = useState<FollowUser[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const isTutor = profile.role === "TUTOR";

  const handleMessage = async () => {
    if (!viewer.signedIn) {
      window.location.href = "/login";
      return;
    }
    setConnecting(true);
    try {
      const res = await connectWithUser(profile.id);
      if (res.ok && res.channelId) {
        showSuccess("Chat opened", { description: `Say hi to ${profile.name.split(" ")[0]}!` });
        window.location.href = `/dashboard/messages?channel=${res.channelId}`;
      } else {
        showError({ title: "Couldn't open chat", cause: res.error, fix: "Try again in a moment." });
      }
    } catch {
      showError({ title: "Couldn't open chat", cause: "Network hiccup.", fix: "Try again in a moment." });
    } finally {
      setConnecting(false);
    }
  };

  const handleFollow = () => {
    if (!viewer.signedIn) {
      window.location.href = "/login";
      return;
    }
    setFollowing((f) => !f);
    startTransition(async () => {
      try {
        await toggleFollow(profile.id);
      } catch {
        setFollowing((f) => !f);
        showError({ title: "Couldn't update follow", cause: "Try again in a moment." });
      }
    });
  };

  const openFollowModal = async (type: "followers" | "following") => {
    setFollowModal(type);
    setFollowUsers(null);
    setListLoading(true);
    try {
      setFollowUsers(await getFollowList(profile.id, type));
    } catch {
      setFollowUsers([]);
    } finally {
      setListLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Cover: layered mesh orbs + organic blobs, solid colors ── */}
      <div className="relative h-48 sm:h-60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-orange via-coral to-pink-600" />
        <BlobDecor variant="mixed" className="opacity-70" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 right-[15%] h-36 w-36 rounded-full border-[10px] border-white/25" />
          <div className="absolute bottom-[-30px] left-[30%] h-28 w-28 rounded-3xl bg-white/15 rotate-12" />
          <div className="absolute top-6 left-[8%] text-white/30 text-6xl font-black select-none">+</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ── Identity ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="-mt-14 sm:-mt-16 relative z-10"
        >
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-5">
            {/* TikTok-style gradient ring avatar */}
            <div className="relative shrink-0 rounded-full p-[4px] bg-gradient-to-br from-brand-orange via-coral to-pink-600 shadow-xl">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background">
                <AvatarImage src={profile.avatar || undefined} alt={profile.name} className="object-cover" />
                <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-brand-orange to-coral text-white">
                  {profile.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {profile.streakDays > 0 && (
                <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-background">
                  <Flame className="h-3 w-3" /> {profile.streakDays}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2 pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">{profile.name}</h1>
                {isTutor && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-md">
                    <BadgeCheck className="h-3 w-3" /> Verified Tutor
                  </span>
                )}
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full bg-gradient-to-r ${
                    TIER_COLORS[profile.tier] || TIER_COLORS.BRONZE
                  } text-white text-[9px] font-black uppercase tracking-widest shadow-md`}
                >
                  {profile.tier}
                </span>
                {viewer.followsYou && (
                  <span className="inline-flex px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border">
                    Follows you
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-muted-foreground text-center sm:text-left">
                @{profile.username}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-orange" /> {profile.county}
                </span>
                {profile.educationLevel && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-cyan-500" />
                    {profile.educationLevel.replace("_", " ").toLowerCase()}
                  </span>
                )}
                {profile.rating != null && profile.rating > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                    <Sparkles className="h-3.5 w-3.5" /> {profile.rating.toFixed(1)} tutor rating
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 justify-center sm:justify-start pt-1">
                {viewer.isSelf ? (
                  <Link href="/dashboard/settings">
                    <Button variant="outline" className="rounded-xl font-black text-xs tracking-widest uppercase h-11 border-border px-6">
                      <Settings className="h-4 w-4 mr-1.5" /> Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={pending}
                      className={`rounded-xl font-black text-xs tracking-widest uppercase h-11 px-7 shadow-md transition-all active:scale-95 ${
                        following
                          ? "bg-secondary text-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : following ? (
                        <><UserCheck className="h-4 w-4 mr-1.5" /> Following</>
                      ) : (
                        <><UserPlus className="h-4 w-4 mr-1.5" /> Follow</>
                      )}
                    </Button>
                    <Button
                      onClick={handleMessage}
                      disabled={connecting}
                      className="rounded-xl font-black text-xs tracking-widest uppercase h-11 px-7 bg-foreground text-background hover:bg-foreground/90 shadow-md active:scale-95"
                    >
                      {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MessageCircle className="h-4 w-4 mr-1.5" /> Message</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Bio ── */}
        {profile.bio && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-center sm:text-left text-base font-medium text-foreground/90 leading-relaxed max-w-2xl whitespace-pre-wrap"
          >
            {profile.bio}
          </motion.p>
        )}

        {/* ── TikTok-style stat row — real counts, clickable ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-7 flex items-stretch justify-center sm:justify-start gap-3"
        >
          <StatTile label="Posts" value={formatCount(profile.postCount)} />
          <StatTile
            label="Followers"
            value={formatCount(profile.followersCount)}
            onClick={() => openFollowModal("followers")}
          />
          <StatTile
            label="Following"
            value={formatCount(profile.followingCount)}
            onClick={() => openFollowModal("following")}
          />
          <StatTile label="Points" value={formatCount(profile.points)} accent />
        </motion.div>

        {/* ── Chips: subjects / goals / sessions ── */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(profile.subjects.length > 0 || profile.tutorSubjects.length > 0) && (
            <SolidCard icon={<BookOpen className="h-4 w-4" />} title={isTutor ? "Teaches" : "Studying"} accent="bg-gradient-to-br from-brand-orange to-coral">
              <div className="flex flex-wrap gap-1.5">
                {(isTutor ? profile.tutorSubjects : profile.subjects).slice(0, 6).map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground/90">
                    {s}
                  </span>
                ))}
              </div>
            </SolidCard>
          )}
          {profile.sessionsCompleted > 0 && (
            <SolidCard icon={<Calendar className="h-4 w-4" />} title="Sessions" accent="bg-gradient-to-br from-cyan-500 to-blue-600">
              <p className="text-2xl font-black">{profile.sessionsCompleted}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">completed</p>
            </SolidCard>
          )}
          {profile.streakDays > 0 && (
            <SolidCard icon={<Flame className="h-4 w-4" />} title="Streak" accent="bg-gradient-to-br from-orange-500 to-red-500">
              <p className="text-2xl font-black">{profile.streakDays} days</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">keep it going</p>
            </SolidCard>
          )}
          {profile.goals.length > 0 && (
            <SolidCard icon={<Zap className="h-4 w-4" />} title="Goals" accent="bg-gradient-to-br from-rose-500 to-pink-600">
              <ul className="space-y-1">
                {profile.goals.slice(0, 3).map((g, i) => (
                  <li key={i} className="text-xs font-medium text-foreground/85 flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </SolidCard>
          )}
        </div>

        {/* ── Achievements ── */}
        {profile.achievements.length > 0 && (
          <section className="mt-9 space-y-4">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Achievements
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile.achievements.map((a, i) => (
                <motion.div
                  key={`${a.type}-${i}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400/15 to-orange-500/15 border border-yellow-500/25 p-4 text-center"
                >
                  <MiniBlobs palette={0} className="opacity-60" />
                  <span className="relative text-2xl">{a.icon}</span>
                  <p className="relative mt-1.5 text-xs font-black leading-tight">{a.title}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── TikTok-style posts grid ── */}
        <section className="mt-11 space-y-4">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-brand-orange" /> Posts
          </h2>
          {profile.posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border py-14 text-center">
              <p className="font-black text-muted-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {viewer.isSelf ? "Share something from your feed!" : `${profile.name.split(" ")[0]} hasn't posted yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {profile.posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-border cursor-pointer"
                >
                  {/* gradient tile background — solid colors */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary" />
                  <div className="absolute -top-6 -right-6 h-24 w-24 bg-gradient-to-br from-brand-orange/25 to-coral/25 [border-radius:63%_37%_54%_46%/55%_48%_52%_45%]" />
                  <div className="absolute -bottom-8 -left-8 h-24 w-24 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 [border-radius:42%_58%_36%_64%/58%_36%_64%_42%]" />

                  <div className="relative h-full flex flex-col justify-between p-4">
                    {post.subject && (
                      <span className="self-start px-2 py-0.5 rounded-md bg-brand-orange/20 border border-brand-orange/30 text-[9px] font-black uppercase tracking-widest text-brand-orange">
                        {post.subject}
                      </span>
                    )}
                    <p className="text-[13px] font-semibold leading-snug line-clamp-4 text-foreground/90">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-black text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-500" /> {formatCount(post.likes)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-500" /> {formatCount(post.commentCount)}
                      </span>
                      <span className="ml-auto text-[10px]">{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* hover veil */}
                  <div className="absolute inset-0 bg-brand-orange/0 group-hover:bg-brand-orange/10 transition-colors" />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Followers / Following modal ── */}
      <AnimatePresence>
        {followModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setFollowModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <MiniBlobs palette={followModal === "followers" ? 0 : 1} />
              <div className="relative flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-lg font-black capitalize tracking-tight">{followModal}</h3>
                <button
                  onClick={() => setFollowModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative max-h-[55vh] overflow-y-auto divide-y divide-border">
                {listLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !followUsers || followUsers.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground font-medium py-12">
                    No {followModal} yet.
                  </p>
                ) : (
                  followUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      onClick={() => setFollowModal(null)}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={u.avatar || undefined} />
                        <AvatarFallback className="text-sm font-black bg-gradient-to-br from-brand-orange to-coral text-white">
                          {u.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{u.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{u.tier}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({
  label,
  value,
  onClick,
  accent,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  const content = (
    <>
      <p className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${accent ? "text-brand-orange" : ""}`}>
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="min-w-[76px] rounded-2xl bg-card border border-border px-4 py-3 text-center shadow-sm hover:border-primary/40 hover:shadow-md active:scale-95 transition-all cursor-pointer"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="min-w-[76px] rounded-2xl bg-card border border-border px-4 py-3 text-center shadow-sm">
      {content}
    </div>
  );
}

function SolidCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-5 shadow-sm space-y-3 hover:-translate-y-0.5 hover:shadow-lg transition-all">
      <MiniBlobs palette={accent.includes("cyan") ? 1 : accent.includes("violet") ? 2 : 0} />
      <div className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-md`}>
        {icon}
      </div>
      <p className="relative text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="relative">{children}</div>
    </div>
  );
}
