"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  MessageCircle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { BlobDecor } from "@/components/ui/blob-decor";
import { MiniBlobs } from "@/components/ui/mini-blobs";
import { connectWithUser, getFollowList, type ProfileData, type ViewerContext } from "@/app/actions/profile";
import { getFeedPage, type FeedPostDTO, type FeedViewer } from "@/app/actions/feed";
import type { SocialUserDTO } from "@/app/actions/social";
import { showError, showSuccess } from "@/lib/toast";
import { formatCount } from "@/lib/social-utils";
import { FollowButton, PostCard, UserAvatar } from "@/components/community/social-feed";
import { RelativeTime } from "@/components/community/relative-time";
import { useFollowing } from "@/components/community/follow-store";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "from-amber-700 to-orange-600",
  SILVER: "from-slate-400 to-zinc-500",
  GOLD: "from-yellow-400 to-amber-500",
  PLATINUM: "from-cyan-400 to-blue-500",
  LEGEND: "from-fuchsia-500 to-rose-500",
};

type ListType = "followers" | "following";

export function ProfileView({
  profile,
  viewer,
  initialPosts,
  initialCursor,
  feedViewer,
  linkedPost,
}: {
  profile: ProfileData;
  viewer: ViewerContext;
  initialPosts: FeedPostDTO[];
  initialCursor: string | null;
  feedViewer: FeedViewer | null;
  linkedPost: FeedPostDTO | null;
}) {
  const [connecting, setConnecting] = useState(false);
  const [listType, setListType] = useState<ListType | null>(null);
  const [posts, setPosts] = useState<FeedPostDTO[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postCount, setPostCount] = useState(profile.postCount);
  const [openPost, setOpenPost] = useState<FeedPostDTO | null>(linkedPost);
  const sentinel = useRef<HTMLDivElement>(null);
  const isTutor = profile.role === "TUTOR";
  const firstName = profile.name.split(" ")[0];

  // Follow state is shared with every other follow button on the page.
  const { following } = useFollowing(profile.id, viewer.isFollowing);
  const followersCount = Math.max(
    0,
    profile.followersCount + (following === viewer.isFollowing ? 0 : following ? 1 : -1),
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getFeedPage({ authorId: profile.id, cursor });
      // A failed page is not the end of the list: keep the cursor so the
      // sentinel retries when it comes back into view.
      if (page.error) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      /* the sentinel will retry when scrolled again */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, profile.id]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && loadMore(), { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  // Drop ?post= from the URL once the modal closes so a refresh doesn't reopen it.
  const closePost = () => {
    setOpenPost(null);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("post")) {
        url.searchParams.delete("post");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      /* non-fatal */
    }
  };

  const handleMessage = async () => {
    if (!viewer.signedIn) {
      window.location.href = "/login";
      return;
    }
    setConnecting(true);
    try {
      const res = await connectWithUser(profile.id);
      if (res.ok && res.channelId) {
        showSuccess("Chat opened", { description: `Say hi to ${firstName}!` });
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

  const subjects = isTutor ? profile.tutorSubjects : profile.subjects;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Cover */}
      <div className="relative h-40 sm:h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-orange via-coral to-pink-600" />
        <BlobDecor variant="mixed" className="opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Identity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="-mt-14 sm:-mt-16 relative z-10"
        >
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-5">
            <div className="relative shrink-0 rounded-full p-[4px] bg-gradient-to-br from-brand-orange via-coral to-pink-600 shadow-xl">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background">
                {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" /> : null}
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

            <div className="flex-1 space-y-2 pb-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">{profile.name}</h1>
                {profile.isVerifiedTutor ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-md">
                    <BadgeCheck className="h-3 w-3" /> Verified tutor
                  </span>
                ) : isTutor ? (
                  <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                    Tutor
                  </span>
                ) : null}
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
              {profile.username && (
                <p className="text-sm font-bold text-muted-foreground">@{profile.username}</p>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs font-bold text-muted-foreground">
                {profile.county && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand-orange" /> {profile.county}
                  </span>
                )}
                {profile.educationLevel && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-cyan-500" />
                    {profile.educationLevel === "UNIVERSITY" ? "University" : "High school"}
                  </span>
                )}
                {profile.rating != null && profile.rating > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                    <Sparkles className="h-3.5 w-3.5" /> {profile.rating.toFixed(1)} rating
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Joined{" "}
                  {new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Nairobi" }).format(
                    new Date(profile.createdAt),
                  )}
                </span>
              </div>

              <div className="flex gap-2.5 justify-center sm:justify-start pt-1">
                {viewer.isSelf ? (
                  <Link href={isTutor ? "/tutor/settings" : "/dashboard/settings"}>
                    <Button variant="outline" className="rounded-xl font-black text-xs tracking-widest uppercase h-10 border-border px-6">
                      <Settings className="h-4 w-4 mr-1.5" /> Edit profile
                    </Button>
                  </Link>
                ) : viewer.signedIn ? (
                  <>
                    <FollowButton userId={profile.id} initial={viewer.isFollowing} size="md" />
                    <Button
                      onClick={handleMessage}
                      disabled={connecting}
                      className="rounded-lg font-black text-xs tracking-widest uppercase h-10 px-5 bg-foreground text-background hover:bg-foreground/90"
                    >
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-1.5" /> Message
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Link href="/login">
                    <Button className="rounded-lg font-black text-xs tracking-widest uppercase h-10 px-6">
                      Sign in to follow
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {profile.bio && (
          <p className="mt-5 text-center sm:text-left text-base font-medium text-foreground/90 leading-relaxed max-w-2xl whitespace-pre-wrap break-words">
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:flex sm:gap-3">
          <StatTile label="Posts" value={formatCount(postCount)} />
          <StatTile label="Followers" value={formatCount(followersCount)} onClick={() => setListType("followers")} />
          <StatTile label="Following" value={formatCount(profile.followingCount)} onClick={() => setListType("following")} />
          <StatTile label="Points" value={formatCount(profile.points)} accent />
        </div>

        {/* About */}
        {(subjects.length > 0 || profile.sessionsCompleted > 0 || profile.goals.length > 0) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjects.length > 0 && (
              <SolidCard icon={<BookOpen className="h-4 w-4" />} title={isTutor ? "Teaches" : "Studying"} accent="from-brand-orange to-coral">
                <div className="flex flex-wrap gap-1.5">
                  {subjects.slice(0, 8).map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground/90">
                      {s}
                    </span>
                  ))}
                </div>
              </SolidCard>
            )}
            {profile.sessionsCompleted > 0 && (
              <SolidCard icon={<Calendar className="h-4 w-4" />} title="Sessions" accent="from-cyan-500 to-blue-600">
                <p className="text-2xl font-black">{profile.sessionsCompleted}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">completed</p>
              </SolidCard>
            )}
            {profile.goals.length > 0 && (
              <SolidCard icon={<Zap className="h-4 w-4" />} title="Goals" accent="from-rose-500 to-pink-600">
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
        )}

        {profile.achievements.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Achievements
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {profile.achievements.map((a) => (
                <div
                  key={a.type}
                  className="shrink-0 w-28 rounded-2xl bg-gradient-to-br from-yellow-400/15 to-orange-500/15 border border-yellow-500/25 p-3 text-center"
                >
                  <span className="text-2xl">{a.icon}</span>
                  <p className="mt-1 text-[11px] font-black leading-tight line-clamp-2">{a.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Posts grid */}
        <section className="mt-9 space-y-4">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-brand-orange" /> Posts
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border py-14 text-center">
              <p className="font-black text-muted-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {viewer.isSelf ? (
                  <>
                    Share your first one from the{" "}
                    <Link href={isTutor ? "/tutor/community" : "/dashboard/community"} className="text-primary font-bold hover:underline">
                      community feed
                    </Link>
                    .
                  </>
                ) : (
                  `${firstName} hasn't posted yet.`
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {posts.map((post) => (
                <button
                  type="button"
                  key={post.id}
                  onClick={() => setOpenPost(post)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-border text-left bg-card hover:border-primary/40 transition-colors"
                >
                  {post.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary" />
                  )}
                  <div className="relative h-full flex flex-col justify-between p-3.5">
                    {post.subject ? (
                      <span className="self-start max-w-full truncate px-2 py-0.5 rounded-md bg-brand-orange/15 text-[9px] font-black uppercase tracking-widest text-brand-orange">
                        {post.subject}
                      </span>
                    ) : (
                      <span />
                    )}
                    {!post.image && (
                      <p className="text-[13px] font-semibold leading-snug line-clamp-4 text-foreground/90 break-words">{post.content}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] font-black text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-500" /> {formatCount(post.likeCount)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-500" /> {formatCount(post.commentCount)}
                      </span>
                      <RelativeTime iso={post.createdAt} className="ml-auto text-[10px]" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                </button>
              ))}
              {loadingMore && [0, 1, 2].map((i) => <Skeleton key={`s${i}`} className="aspect-square rounded-2xl" />)}
            </div>
          )}
          <div ref={sentinel} aria-hidden className="h-1" />
        </section>
      </div>

      {/* Post viewer */}
      <Modal open={!!openPost} onClose={closePost} label="Post">
        {openPost && (
          <PostCard
            key={openPost.id}
            post={openPost}
            viewer={feedViewer}
            defaultCommentsOpen={!!feedViewer}
            onDeleted={(id) => {
              setPosts((prev) => prev.filter((p) => p.id !== id));
              setPostCount((c) => Math.max(0, c - 1));
              closePost();
            }}
          />
        )}
      </Modal>

      {/* Followers / following */}
      <Modal open={!!listType} onClose={() => setListType(null)} label={listType ?? ""} title={listType === "followers" ? "Followers" : "Following"}>
        {listType && <FollowList key={listType} profileId={profile.id} type={listType} signedIn={viewer.signedIn} onNavigate={() => setListType(null)} />}
      </Modal>
    </div>
  );
}

function FollowList({
  profileId,
  type,
  signedIn,
  onNavigate,
}: {
  profileId: string;
  type: ListType;
  signedIn: boolean;
  onNavigate: () => void;
}) {
  const [users, setUsers] = useState<SocialUserDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLLIElement>(null);

  const load = useCallback(
    async (c: string | null) => {
      setLoading(true);
      try {
        const res = await getFollowList(profileId, type, c);
        setUsers((prev) => {
          const base = c ? prev ?? [] : [];
          const seen = new Set(base.map((u) => u.id));
          return [...base, ...res.users.filter((u) => !seen.has(u.id))];
        });
        setCursor(res.nextCursor);
      } catch {
        setUsers((prev) => prev ?? []);
      } finally {
        setLoading(false);
      }
    },
    [profileId, type],
  );

  useEffect(() => {
    load(null);
  }, [load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || loading) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && load(cursor));
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading, load]);

  if (users === null) {
    return (
      <div className="p-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }
  if (users.length === 0) {
    return <p className="text-center text-sm text-muted-foreground font-medium py-12">No {type} yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-5 py-3">
          <Link href={`/profile/${u.id}`} onClick={onNavigate} className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatar name={u.name} avatar={u.avatar} />
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{u.name}</p>
              <p className="text-[11px] font-semibold text-muted-foreground truncate">
                {u.username ? `@${u.username}` : u.role === "TUTOR" ? "Tutor" : "Student"}
                {u.followsYou && !u.isSelf ? " · Follows you" : ""}
              </p>
            </div>
          </Link>
          {signedIn && !u.isSelf && <FollowButton userId={u.id} initial={u.isFollowing} size="xs" />}
        </li>
      ))}
      <li ref={sentinel} aria-hidden className="h-1 list-none">
        {loading && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </li>
    </ul>
  );
}

function Modal({
  open,
  onClose,
  label,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-border bg-background/95 backdrop-blur">
              <h3 className="text-base font-black tracking-tight">{title ?? ""}</h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={title ? "" : "p-3"}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
      <p className={`text-xl sm:text-2xl font-black tracking-tight leading-none tabular-nums ${accent ? "text-brand-orange" : ""}`}>
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </>
  );
  const cls = "sm:min-w-[84px] rounded-2xl bg-card border border-border px-2 sm:px-4 py-3 text-center shadow-sm";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:border-primary/40 hover:shadow-md active:scale-95 transition-all`}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
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
    <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-5 shadow-sm space-y-3">
      <MiniBlobs palette={accent.includes("cyan") ? 1 : 0} />
      <div className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-md`}>
        {icon}
      </div>
      <p className="relative text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="relative">{children}</div>
    </div>
  );
}
