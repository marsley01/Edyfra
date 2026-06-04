"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Flame,
  Heart,
  Sparkles,
  Eye,
  MessageCircle,
  Send,
  Plus,
  Hash,
  Search as SearchIcon,
  Users,
  TrendingUp,
  Clock,
  Pin,
  Lock,
  ChevronRight,
  Hand,
  Lightbulb,
  PartyPopper,
  Eye as EyeIcon,
  Reply,
  CheckCheck,
  Crown,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  getForumBootstrap,
  getForumTopic,
  createForumTopic,
  createForumPost,
  toggleForumReaction,
  toggleForumSubscription,
  markForumTopicRead,
  type CommunityBootstrap,
  type CommunityThread,
  type CommunityThreadPost,
} from "@/app/actions/community";

/* ──────────────────────────────────────────────────────────────────────────
   The whole community lives in two views: a "list" of topics and a
   "thread" of replies. The data is pulled server-side via actions, then
   cached in client state. We revalidate on action calls.

   The visual language is intentionally warm and monochrome. No rainbows,
   no rainbow gradients, no per-category colours. One amber family for
   light, one warmer amber-orange family for dark. The only "highlight"
   colour is a single warm amber accent for active states and pinned posts.
   ────────────────────────────────────────────────────────────────────────── */

const REACTIONS: Array<{ type: string; label: string; emoji: string; icon: any }> = [
  { type: "heart", label: "Love",   emoji: "❤️", icon: Heart },
  { type: "fire",  label: "Fire",   emoji: "🔥", icon: Flame },
  { type: "hug",   label: "Hug",    emoji: "🤗", icon: Hand },
  { type: "idea",  label: "Idea",   emoji: "💡", icon: Lightbulb },
  { type: "yay",   label: "Yay",    emoji: "🎉", icon: PartyPopper },
  { type: "eyes",  label: "Seen",   emoji: "👀", icon: EyeIcon },
];

type Bootstrap = CommunityBootstrap;
type TopicRow = CommunityBootstrap["topics"][number];
type Thread = CommunityThread;

export function CommunityForum({
  role,
  basePath,
}: {
  role: "student" | "tutor";
  /** e.g. "/dashboard/community" or "/tutor/community" */
  basePath: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "thread">("list");
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [data, setData] = useState<Bootstrap | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await getForumBootstrap();
    setData(res);
    setLoading(false);
  }, []);

  const openThread = useCallback(async (topicId: string) => {
    setActiveTopicId(topicId);
    setView("thread");
    const res = await getForumTopic(topicId);
    if (res.ok) setThread(res);
    else toast.error(res.error);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Real-time-ish "alive" ping: refetch the bootstrap every 45s so the
  // "online" count moves and new topics float up. Slower on mobile to save
  // battery; pauses when the tab is hidden or the device is offline.
  useEffect(() => {
    if (view !== "list") return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (document.hidden) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      loadList();
    };
    id = setInterval(tick, 45_000);
    return () => {
      if (id) clearInterval(id);
    };
  }, [view, loadList]);

  // Refetch the thread every 20s — slower to save mobile data. Pauses on
  // hidden tab.
  useEffect(() => {
    if (view !== "thread" || !activeTopicId) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      if (document.hidden) return;
      const res = await getForumTopic(activeTopicId);
      if (res.ok) setThread(res);
    };
    id = setInterval(tick, 20_000);
    return () => {
      if (id) clearInterval(id);
    };
  }, [view, activeTopicId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.topics;
    if (activeCategory) rows = rows.filter((t) => t.category.slug === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.title.toLowerCase().includes(q) || t.bodyPreview.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, activeCategory, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {view === "list" && (
        <ForumList
          data={data}
          loading={loading}
          basePath={basePath}
          role={role}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          onOpenThread={openThread}
          onNewTopic={() => setComposerOpen(true)}
        />
      )}
      {view === "thread" && thread && (
        <ForumThread
          basePath={basePath}
          role={role}
          thread={thread}
          onBack={() => { setView("list"); loadList(); }}
          onRefresh={async () => {
            if (!activeTopicId) return;
            const res = await getForumTopic(activeTopicId);
            if (res.ok) setThread(res);
          }}
        />
      )}
      {composerOpen && data && (
        <NewTopicDialog
          categories={data.categories}
          onClose={() => setComposerOpen(false)}
          onCreated={(id) => {
            setComposerOpen(false);
            startTransition(() => {
              openThread(id);
              loadList();
            });
          }}
        />
      )}
    </div>
  );
}

/* ─── List view ──────────────────────────────────────────────────────────── */

function ForumList(props: {
  data: Bootstrap | null;
  loading: boolean;
  basePath: string;
  role: "student" | "tutor";
  activeCategory: string | null;
  setActiveCategory: (s: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  filtered: TopicRow[];
  onOpenThread: (id: string) => void;
  onNewTopic: () => void;
}) {
  const {
    data, loading, basePath, role,
    activeCategory, setActiveCategory, search, setSearch,
    filtered, onOpenThread, onNewTopic,
  } = props;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Warm welcome banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200/60 dark:border-amber-800/30 p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-amber-300/20 dark:bg-amber-700/10 blur-3xl" />
        <div className="absolute -right-16 -bottom-12 w-56 h-56 rounded-full bg-orange-300/20 dark:bg-orange-700/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3" /> Edyfra Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Hey {data?.me?.name?.split(" ")[0] || "there"} — let's chat.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              A friendly forum for students and tutors. Drop a topic, get unstuck,
              share a win, or just say hi. Edyfra people only — safe by design.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {data?.stats.onlineCount ?? 0} online now
            </div>
            <div className="px-3 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-semibold">
              {data?.stats.totalTopics ?? 0} topics · {data?.stats.totalPosts ?? 0} replies
            </div>
            <Button
              onClick={onNewTopic}
              className="h-10 px-4 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-900/10"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New topic
            </Button>
          </div>
        </div>
      </div>

      {/* Search + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics, replies, anything…"
                className="pl-10 h-11 rounded-2xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-5">
            <Chip active={!activeCategory} onClick={() => setActiveCategory(null)}>
              <Hash className="h-3.5 w-3.5 mr-1" /> All
            </Chip>
            {data?.categories.map((c) => (
              <Chip
                key={c.id}
                active={activeCategory === c.slug}
                onClick={() => setActiveCategory(c.slug === activeCategory ? null : c.slug)}
              >
                <span className="mr-1.5">{c.emoji}</span> {c.name}
              </Chip>
            ))}
          </div>

          {/* Topic list */}
          {loading && !data ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState onNewTopic={onNewTopic} />
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((t, i) => (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025 }}
                >
                  <TopicRow
                    topic={t}
                    basePath={basePath}
                    me={data?.me ?? null}
                    onOpen={() => onOpenThread(t.id)}
                  />
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <SidebarCard
            title="Trending today"
            icon={TrendingUp}
          >
            <ul className="space-y-2">
              {data?.topics.slice(0, 4).map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onOpenThread(t.id)}
                    className="w-full text-left text-sm leading-snug text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition"
                  >
                    <span className="font-semibold line-clamp-1">{t.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"} · {t.lastActivityAgo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </SidebarCard>

          <SidebarCard title="Community code" icon={Hand}>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>· Be kind. We're all learning.</li>
              <li>· Search before posting a topic.</li>
              <li>· Tutor replies are highlighted.</li>
              <li>· Personal data? DM, don't post.</li>
            </ul>
          </SidebarCard>

          {role === "tutor" && (
            <SidebarCard title="You're a tutor" icon={GraduationCap}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your replies show a small "Tutor" pill so students can spot
                you in the thread. No special admin powers here — just the
                same warm space, with a little extra weight on your words.
              </p>
            </SidebarCard>
          )}
        </aside>
      </div>
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center h-8 px-3.5 rounded-full text-xs font-bold transition border",
        active
          ? "bg-amber-600 text-white border-amber-600 shadow"
          : "bg-card text-foreground border-border hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function TopicRow({
  topic, basePath, me, onOpen,
}: { topic: TopicRow; basePath: string; me: Bootstrap["me"]; onOpen: () => void }) {
  const isMine = me?.id === topic.author.id;
  return (
    <button
      onClick={onOpen}
      className="group w-full text-left rounded-2xl bg-card border border-border hover:border-amber-500/50 transition px-4 sm:px-5 py-4 shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar src={topic.author.avatar} name={topic.author.name} role={topic.author.role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {topic.pinned && <Pill icon={Pin} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Pinned</Pill>}
            {topic.locked && <Pill icon={Lock} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Locked</Pill>}
            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
              {topic.category.emoji} {topic.category.name}
            </span>
            {topic.hasUnread && (
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest">
                New
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
            {topic.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
            {topic.bodyPreview}
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">{topic.author.name}</span>
            {isMine && <span className="text-amber-600 dark:text-amber-400">(you)</span>}
            <span>·</span>
            <span>{topic.lastActivityAgo}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {topic.replyCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {topic.reactionCount}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Avatar({ src, name, role }: { src?: string | null; name: string; role: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-800 dark:text-amber-200 font-black text-sm shrink-0 overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : initial}
      {role === "TUTOR" && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[8px] font-black border-2 border-card">
          T
        </span>
      )}
    </div>
  );
}

function Pill({
  icon: Icon, className, children,
}: { icon: any; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
      className
    )}>
      <Icon className="h-2.5 w-2.5" /> {children}
    </span>
  );
}

function SidebarCard({
  title, icon: Icon, children,
}: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground/80">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-2xl bg-card border border-border px-5 py-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ onNewTopic }: { onNewTopic: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-300/70 dark:border-amber-700/40 bg-amber-50/40 dark:bg-amber-950/10 p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-2xl">
        🌱
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground">
        Be the first to start something
      </h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
        No topics here yet. Drop a question, share a tip, or just say hi to break the ice.
      </p>
      <Button
        onClick={onNewTopic}
        className="mt-5 h-10 px-4 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest"
      >
        <Plus className="h-4 w-4 mr-1.5" /> Start the first topic
      </Button>
    </div>
  );
}

/* ─── Thread view ────────────────────────────────────────────────────────── */

function ForumThread({
  basePath, role, thread, onBack, onRefresh,
}: {
  basePath: string;
  role: "student" | "tutor";
  thread: Thread;
  onBack: () => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(thread.subscribed);
  const listRef = useRef<HTMLDivElement>(null);

  // Index posts by id for parent lookup
  const postsById = useMemo(() => {
    const m: Record<string, typeof thread.posts[number]> = {};
    thread.posts.forEach((p) => { m[p.id] = p; });
    return m;
  }, [thread.posts]);

  const topLevel = useMemo(() => thread.posts.filter((p) => !p.parentId), [thread.posts]);
  const childrenOf = (id: string) => thread.posts.filter((p) => p.parentId === id);

  const submit = async () => {
    const text = reply.trim();
    if (!text) return;
    setBusy(true);
    const res = await createForumPost({
      topicId: thread.topic.id,
      body: text,
      parentId: replyTo?.id ?? null,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    setReply("");
    setReplyTo(null);
    await onRefresh();
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 80);
  };

  const react = async (type: string, postId?: string) => {
    const res = await toggleForumReaction({ type, postId, topicId: postId ? undefined : thread.topic.id });
    if (!res.ok) { toast.error("Couldn't react"); return; }
    await onRefresh();
  };

  const sub = async () => {
    const res = await toggleForumSubscription(thread.topic.id);
    if (!res.ok) { toast.error("Couldn't update"); return; }
    setSubscribed(res.subscribed);
    toast.success(res.subscribed ? "You'll get a ping for new replies" : "No more pings");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 mb-4 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to community
      </button>

      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 mb-6 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {thread.topic.pinned && <Pill icon={Pin} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Pinned</Pill>}
          {thread.topic.locked && <Pill icon={Lock} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Locked</Pill>}
          <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
            {thread.topic.category.emoji} {thread.topic.category.name}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
          {thread.topic.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <Avatar src={thread.topic.author.avatar} name={thread.topic.author.name} role={thread.topic.author.role} />
          <div>
            <div className="font-bold">{thread.topic.author.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(thread.topic.createdAt).toLocaleString()} · {thread.topic.views} views
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={sub}
              variant="outline"
              className={cn(
                "h-9 px-3.5 rounded-full font-bold text-xs",
                subscribed
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950"
                  : "border-border"
              )}
            >
              {subscribed ? <BellRing className="h-3.5 w-3.5 mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
              {subscribed ? "Subscribed" : "Subscribe"}
            </Button>
          </div>
        </div>
        <div className="mt-5 prose prose-amber dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
          {thread.topic.body}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {REACTIONS.map((r) => {
            const tally = thread.topic.reactions[r.type];
            if (!tally) return (
              <ReactionButton key={r.type} onClick={() => react(r.type)}>
                <span aria-hidden>{r.emoji}</span> <span className="ml-1">{r.label}</span>
              </ReactionButton>
            );
            return (
              <ReactionButton
                key={r.type}
                active={tally.mine}
                onClick={() => react(r.type)}
              >
                <span aria-hidden>{r.emoji}</span> {tally.count}
              </ReactionButton>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">
          {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}
        </h2>
        <button
          onClick={() => markForumTopicRead(thread.topic.id).then(onRefresh)}
          className="text-[11px] font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <CheckCheck className="h-3 w-3" /> Mark as read
        </button>
      </div>

      <div ref={listRef} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {topLevel.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-300/70 dark:border-amber-700/40 p-6 text-center text-sm text-muted-foreground">
            No replies yet — be the first to chime in.
          </div>
        ) : (
          topLevel.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              replies={childrenOf(p.id)}
              postsById={postsById}
              onReact={(t) => react(t, p.id)}
              onReply={(id, name) => {
                setReplyTo({ id, name });
                document.getElementById("reply-box")?.focus();
              }}
            />
          ))
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border p-4 sm:p-5 shadow-sm">
        {replyTo && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
            <Reply className="h-3 w-3" /> Replying to {replyTo.name}
            <button onClick={() => setReplyTo(null)} className="ml-1 hover:text-amber-700">×</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            id="reply-box"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={thread.topic.locked ? "Topic is locked" : `Reply${role === "tutor" ? " as a tutor" : ""}…`}
            disabled={thread.topic.locked}
            rows={3}
            className="flex-1 rounded-2xl bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
          />
          <Button
            onClick={submit}
            disabled={busy || !reply.trim() || thread.topic.locked}
            className="h-12 w-12 rounded-2xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 shadow-lg shadow-amber-900/10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post, replies, onReact, onReply,
}: {
  post: Thread["posts"][number];
  replies: Thread["posts"];
  postsById: Record<string, Thread["posts"][number]>;
  onReact: (type: string) => void;
  onReply: (parentId: string, name: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar src={post.author.avatar} name={post.author.name} role={post.author.role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-sm">{post.author.name}</span>
            {post.author.role === "TUTOR" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-amber-600 text-white">
                <Crown className="h-2.5 w-2.5" /> Tutor
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{post.createdAgo}</span>
            {post.isAnswer && (
              <Pill icon={CheckCheck} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Answer</Pill>
            )}
          </div>
          <div className="mt-1.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {post.body}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {REACTIONS.map((r) => {
              const tally = post.reactions[r.type];
              if (!tally) return (
                <ReactionButton key={r.type} size="sm" onClick={() => onReact(r.type)}>
                  <span aria-hidden>{r.emoji}</span>
                </ReactionButton>
              );
              return (
                <ReactionButton
                  key={r.type}
                  size="sm"
                  active={tally.mine}
                  onClick={() => onReact(r.type)}
                >
                  <span aria-hidden>{r.emoji}</span> {tally.count}
                </ReactionButton>
              );
            })}
            <button
              onClick={() => onReply(post.id, post.author.name)}
              className="ml-1 inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="mt-3 ml-6 sm:ml-12 pl-3 sm:pl-4 border-l-2 border-border space-y-2.5">
          {replies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{r.author.name}</span>
                {r.author.role === "TUTOR" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-amber-600 text-white">
                    <Crown className="h-2.5 w-2.5" /> Tutor
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{r.createdAgo}</span>
              </div>
              <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {r.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ReactionButton({
  children, onClick, active, size,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; size?: "sm" | "md" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border transition font-bold",
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-xs",
        active
          ? "bg-amber-600 border-amber-600 text-white shadow"
          : "bg-card border-border text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ─── New-topic dialog ──────────────────────────────────────────────────── */

function NewTopicDialog({
  categories, onClose, onCreated,
}: {
  categories: Bootstrap["categories"];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await createForumTopic({ title, body, categoryId });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Topic posted");
    onCreated(res.topicId);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.97 }}
          className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <h2 className="text-base font-black text-foreground">Start a new topic</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Be specific. People are more likely to help when they know exactly what you need.
          </p>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  active={c.id === categoryId}
                  onClick={() => setCategoryId(c.id)}
                >
                  <span className="mr-1">{c.emoji}</span> {c.name}
                </Chip>
              ))}
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A clear title, e.g. 'Stuck on integration by parts'"
              maxLength={160}
              className="h-11 rounded-2xl bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What have you tried? Where are you stuck? A little context goes a long way…"
              rows={6}
              maxLength={8000}
              className="rounded-2xl bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{body.length} / 8000</span>
              <span>Auto-saved to your drafts</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-full text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest px-5 h-10"
            >
              {busy ? "Posting…" : "Post topic"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
