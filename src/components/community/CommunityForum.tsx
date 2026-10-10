"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Flame,
  Heart,
  Sparkles,
  Send,
  Plus,
  Hash,
  Search as SearchIcon,
  TrendingUp,
  Pin,
  Lock,
  Hand,
  Lightbulb,
  PartyPopper,
  Eye as EyeIcon,
  Reply,
  CheckCheck,
  Crown,
  GraduationCap,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

import {
  getForumBootstrap,
  getForumTopic,
  createForumTopic,
  createForumPost,
  toggleForumReaction,
  toggleForumSubscription,
  type CommunityBootstrap,
  type CommunityThread,
  type CommunityThreadPost,
} from "@/app/actions/community";

/* ──────────────────────────────────────────────────────────────────────────
   The whole community lives in two views: a "list" of topics and a
   "thread" of replies. Topics are filtered/searched server-side and paged
   with a keyset cursor; every mutation patches client state in place
   (no full refetch).

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
  embedded = false,
}: {
  role: "student" | "tutor";
  /** e.g. "/dashboard/community" or "/tutor/community" */
  basePath: string;
  /** Rendered inside CommunityHub (which owns the page title). */
  embedded?: boolean;
}) {
  const [view, setView] = useState<"list" | "thread">("list");
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [data, setData] = useState<Bootstrap | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const listReq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // First page for the current category/search (server-side filtering).
  const loadList = useCallback(async () => {
    const req = ++listReq.current;
    setLoading(true);
    try {
      const res = await getForumBootstrap({ category: activeCategory, q: debouncedSearch || null });
      if (req !== listReq.current) return;
      if ("ok" in res) {
        setAuthError(res.error);
        return;
      }
      setAuthError(null);
      setData(res);
    } catch (err) {
      console.error("Failed to load community:", err);
    } finally {
      if (req === listReq.current) setLoading(false);
    }
  }, [activeCategory, debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return;
    const req = listReq.current;
    setLoadingMore(true);
    try {
      const res = await getForumBootstrap({ category: activeCategory, q: debouncedSearch || null, cursor: data.nextCursor });
      if (req !== listReq.current || "ok" in res) return;
      setData((prev) => {
        if (!prev) return prev;
        const seen = new Set(prev.topics.map((t) => t.id));
        return { ...prev, topics: [...prev.topics, ...res.topics.filter((t) => !seen.has(t.id))], nextCursor: res.nextCursor };
      });
    } finally {
      setLoadingMore(false);
    }
  }, [data?.nextCursor, loadingMore, activeCategory, debouncedSearch]);

  const openThread = useCallback(async (topicId: string) => {
    setActiveTopicId(topicId);
    // Drop the previously open thread so we never flash (or post into) the
    // wrong topic while the new one loads.
    setThread((prev) => (prev?.topic.id === topicId ? prev : null));
    setView("thread");
    let res: Awaited<ReturnType<typeof getForumTopic>>;
    try {
      res = await getForumTopic(topicId);
    } catch {
      res = { ok: false, error: "Something hiccuped on our side." };
    }
    if (res.ok) {
      setThread(res);
      // Opening marks it read — reflect that in the list without a refetch.
      setData((prev) =>
        prev ? { ...prev, topics: prev.topics.map((t) => (t.id === topicId ? { ...t, hasUnread: false } : t)) } : prev,
      );
    } else {
      setView("list");
      showError({ title: "We couldn't open that topic", cause: res.error, fix: "Try again, or refresh the page." });
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Deep link from notifications: `${basePath}?topic=<id>` opens that thread.
  useEffect(() => {
    const topicId = new URLSearchParams(window.location.search).get("topic");
    if (topicId) openThread(topicId);
  }, [openThread]);

  // Quietly pick up new replies every 20s while a thread is open (paused when
  // the tab is hidden). Background refreshes don't count as views.
  useEffect(() => {
    if (view !== "thread" || !activeTopicId) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const res = await getForumTopic(activeTopicId, { countView: false }).catch(() => null);
      if (res?.ok) setThread((prev) => (prev && prev.topic.id === res.topic.id ? res : prev));
    }, 20_000);
    return () => clearInterval(id);
  }, [view, activeTopicId]);

  const patchThread = useCallback((fn: (t: Thread) => Thread) => {
    setThread((prev) => (prev ? fn(prev) : prev));
  }, []);

  const backToList = () => {
    setView("list");
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("topic")) {
        url.searchParams.delete("topic");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      /* non-fatal */
    }
  };

  if (authError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-black">{authError}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Discussions are for Edyfra students and tutors.</p>
        <Link href="/login" className="inline-block mt-5">
          <Button className="rounded-lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("bg-background text-foreground", !embedded && "min-h-screen")}>
      {view === "list" && (
        <ForumList
          data={data}
          loading={loading}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          embedded={embedded}
          role={role}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          search={search}
          setSearch={setSearch}
          onOpenThread={openThread}
          onNewTopic={() => setComposerOpen(true)}
        />
      )}
      {view === "thread" && !thread && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <SkeletonList />
        </div>
      )}
      {view === "thread" && thread && (
        <ForumThread
          key={thread.topic.id}
          basePath={basePath}
          role={role}
          me={data?.me ?? null}
          thread={thread}
          onPatch={patchThread}
          onBack={backToList}
          onReplied={(topicId) =>
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    topics: prev.topics.map((t) =>
                      t.id === topicId
                        ? { ...t, replyCount: t.replyCount + 1, lastActivityAt: new Date().toISOString(), lastActivityAgo: "just now" }
                        : t,
                    ),
                  }
                : prev,
            )
          }
        />
      )}
      {composerOpen && data && (
        <NewTopicDialog
          categories={data.categories}
          initialCategorySlug={activeCategory}
          onClose={() => setComposerOpen(false)}
          onCreated={(id) => {
            setComposerOpen(false);
            openThread(id);
            loadList();
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
  loadingMore: boolean;
  onLoadMore: () => void;
  embedded: boolean;
  role: "student" | "tutor";
  activeCategory: string | null;
  setActiveCategory: (s: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  onOpenThread: (id: string) => void;
  onNewTopic: () => void;
}) {
  const {
    data, loading, loadingMore, onLoadMore, embedded, role,
    activeCategory, setActiveCategory, search, setSearch,
    onOpenThread, onNewTopic,
  } = props;
  const topics = data?.topics ?? [];
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data?.nextCursor || loading) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && onLoadMore(), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [data?.nextCursor, loading, onLoadMore]);

  // Busiest loaded threads (replies + reactions), not just the newest.
  const busy = useMemo(
    () =>
      [...topics]
        .filter((t) => t.replyCount + t.reactionCount > 0)
        .sort((a, b) => b.replyCount + b.reactionCount - (a.replyCount + a.reactionCount))
        .slice(0, 4),
    [topics],
  );

  return (
    <div className={cn("max-w-6xl mx-auto px-4 sm:px-6", embedded ? "py-5" : "py-8 sm:py-10")}>
      {/* Warm welcome banner */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200/60 dark:border-amber-800/30 p-5 sm:p-7 mb-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-amber-300/20 dark:bg-amber-700/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Hey {data?.me?.name?.split(" ")[0] || "there"} — what are you stuck on?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Start a topic, get unstuck, share a win. Edyfra students and tutors only.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data && (
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-semibold">
                {data.stats.totalTopics} topics · {data.stats.totalPosts} replies
              </div>
            )}
            <Button
              onClick={onNewTopic}
              disabled={!data}
              className="h-10 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-900/10"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New topic
            </Button>
          </div>
        </div>
      </div>

      {/* Search + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="min-w-0">
          <div className="relative mb-4">
            <SearchIcon className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all topics…"
              className="pl-10 h-11 rounded-2xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
            />
            {loading && data && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
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
          ) : topics.length === 0 ? (
            search.trim() || activeCategory ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No topics match that. Try another word or category — or start one.
              </div>
            ) : (
              <EmptyState onNewTopic={onNewTopic} />
            )
          ) : (
            <ul className={cn("space-y-2.5 transition-opacity", loading && "opacity-60")}>
              {topics.map((t) => (
                <li key={t.id}>
                  <TopicRow topic={t} me={data?.me ?? null} onOpen={() => onOpenThread(t.id)} />
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} aria-hidden className="h-1" />
          {loadingMore && (
            <div className="mt-3">
              <SkeletonList count={2} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {busy.length > 0 && (
            <SidebarCard title="Busy threads" icon={TrendingUp}>
              <ul className="space-y-2">
                {busy.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => onOpenThread(t.id)}
                      className="w-full text-left text-sm leading-snug text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition"
                    >
                      <span className="font-semibold line-clamp-1">{t.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"} · <RelativeTime iso={t.lastActivityAt} suffix />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </SidebarCard>
          )}

          <SidebarCard title="Community code" icon={Hand}>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>· Be kind. We&apos;re all learning.</li>
              <li>· Search before posting a topic.</li>
              <li>· Tutor replies are highlighted.</li>
              <li>· Personal data? DM, don&apos;t post.</li>
            </ul>
          </SidebarCard>

          {role === "tutor" && (
            <SidebarCard title="You're a tutor" icon={GraduationCap}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your replies show a &quot;Tutor&quot; pill so students can spot you in the thread.
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
        "inline-flex items-center h-8 px-3.5 rounded-lg text-xs font-bold transition border",
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
  topic, me, onOpen,
}: { topic: TopicRow; me: Bootstrap["me"]; onOpen: () => void }) {
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
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest">
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
            <RelativeTime iso={topic.lastActivityAt} suffix />
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
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-amber-600 text-white flex items-center justify-center text-[8px] font-black border-2 border-card">
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

function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
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
    <div className="rounded-xl border-2 border-dashed border-amber-300/70 dark:border-amber-700/40 bg-amber-50/40 dark:bg-amber-950/10 p-10 text-center">
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
        className="mt-5 h-10 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest"
      >
        <Plus className="h-4 w-4 mr-1.5" /> Start the first topic
      </Button>
    </div>
  );
}

/* ─── Thread view ────────────────────────────────────────────────────────── */

type Tally = Record<string, { count: number; mine: boolean }>;

/** Applies one reaction change to a tally (pure — used for optimistic UI and rollback). */
function applyReaction(tally: Tally, type: string, active: boolean): Tally {
  const cur = tally[type] ?? { count: 0, mine: false };
  if (cur.mine === active) return tally;
  const count = Math.max(0, cur.count + (active ? 1 : -1));
  const next = { ...tally };
  if (count === 0) delete next[type];
  else next[type] = { count, mine: active };
  return next;
}

function ForumThread({
  role, me, thread, onPatch, onBack, onReplied,
}: {
  basePath: string;
  role: "student" | "tutor";
  me: Bootstrap["me"];
  thread: Thread;
  onPatch: (fn: (t: Thread) => Thread) => void;
  onBack: () => void;
  onReplied: (topicId: string) => void;
}) {
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(thread.subscribed);
  const [subBusy, setSubBusy] = useState(false);
  const replyBoxRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const topLevel = useMemo(() => thread.posts.filter((p) => !p.parentId), [thread.posts]);
  const childrenByParent = useMemo(() => {
    const m = new Map<string, CommunityThreadPost[]>();
    for (const p of thread.posts) {
      if (!p.parentId) continue;
      const list = m.get(p.parentId) ?? [];
      list.push(p);
      m.set(p.parentId, list);
    }
    return m;
  }, [thread.posts]);

  const submit = async () => {
    const text = reply.trim();
    if (!text || busy) return;
    setBusy(true);
    let res: Awaited<ReturnType<typeof createForumPost>>;
    try {
      res = await createForumPost({ topicId: thread.topic.id, body: text, parentId: replyTo?.id ?? null });
    } catch {
      res = { ok: false, error: "Something hiccuped on our side." };
    } finally {
      setBusy(false);
    }
    if (!res.ok) {
      showError({ title: "We couldn't post your reply", cause: res.error, fix: "Your text is still in the box — try again." });
      return;
    }
    const created = res.post;
    onPatch((t) => (t.posts.some((p) => p.id === created.id) ? t : { ...t, posts: [...t.posts, created] }));
    onReplied(thread.topic.id);
    setReply("");
    setReplyTo(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
  };

  const react = async (type: string, postId?: string) => {
    const current = postId
      ? thread.posts.find((p) => p.id === postId)?.reactions[type]?.mine ?? false
      : thread.topic.reactions[type]?.mine ?? false;
    const want = !current;
    const patch = (active: boolean) =>
      onPatch((t) =>
        postId
          ? { ...t, posts: t.posts.map((p) => (p.id === postId ? { ...p, reactions: applyReaction(p.reactions, type, active) } : p)) }
          : { ...t, topic: { ...t.topic, reactions: applyReaction(t.topic.reactions, type, active) } },
      );
    patch(want);
    const res = await toggleForumReaction({ type, postId, topicId: postId ? undefined : thread.topic.id }).catch(() => null);
    if (!res?.ok) {
      patch(current);
      showError({ title: "We couldn't save your reaction", cause: "Something hiccuped on our side.", fix: "Tap the reaction again in a moment." });
      return;
    }
    if (res.active !== want) patch(res.active);
  };

  const sub = async () => {
    if (subBusy) return;
    const want = !subscribed;
    setSubscribed(want);
    setSubBusy(true);
    const res = await toggleForumSubscription(thread.topic.id).catch(() => null);
    setSubBusy(false);
    if (!res?.ok) {
      setSubscribed(!want);
      showError({ title: "We couldn't update that", cause: "Something hiccuped on our side.", fix: "Try again, or refresh the page." });
      return;
    }
    setSubscribed(res.subscribed);
    showSuccess(res.subscribed ? "You're subscribed" : "You're unsubscribed", {
      description: res.subscribed ? "We'll ping you when someone replies." : "We won't ping you for new replies.",
    });
  };

  const startReply = (id: string, name: string) => {
    setReplyTo({ id, name });
    replyBoxRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 mb-4 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All discussions
      </button>

      <div className="rounded-xl bg-card border border-border p-5 sm:p-7 mb-6 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {thread.topic.pinned && <Pill icon={Pin} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Pinned</Pill>}
          {thread.topic.locked && <Pill icon={Lock} className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Locked</Pill>}
          <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
            {thread.topic.category.emoji} {thread.topic.category.name}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight break-words">
          {thread.topic.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <Link href={`/profile/${thread.topic.author.id}`}>
            <Avatar src={thread.topic.author.avatar} name={thread.topic.author.name} role={thread.topic.author.role} />
          </Link>
          <div className="min-w-0">
            <Link href={`/profile/${thread.topic.author.id}`} className="font-bold hover:text-amber-600 dark:hover:text-amber-400">
              {thread.topic.author.name}
            </Link>
            <div className="text-[11px] text-muted-foreground">
              <RelativeTime iso={thread.topic.createdAt} suffix /> · {thread.topic.views} {thread.topic.views === 1 ? "view" : "views"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={sub}
              variant="outline"
              disabled={subBusy}
              className={cn(
                "h-9 px-3.5 rounded-lg font-bold text-xs",
                subscribed
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950"
                  : "border-border",
              )}
            >
              {subscribed ? <BellRing className="h-3.5 w-3.5 mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
              {subscribed ? "Subscribed" : "Subscribe"}
            </Button>
          </div>
        </div>
        <div className="mt-5 max-w-none text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {thread.topic.body}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {REACTIONS.map((r) => {
            const tally = thread.topic.reactions[r.type];
            return (
              <ReactionButton key={r.type} active={tally?.mine} onClick={() => react(r.type)} label={r.label}>
                <span aria-hidden>{r.emoji}</span>
                {tally ? <span className="ml-1 tabular-nums">{tally.count}</span> : <span className="ml-1">{r.label}</span>}
              </ReactionButton>
            );
          })}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-foreground/80">
        {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}
      </h2>

      <div className="space-y-3">
        {topLevel.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-300/70 dark:border-amber-700/40 p-6 text-center text-sm text-muted-foreground">
            No replies yet — be the first to chime in.
          </div>
        ) : (
          topLevel.map((p) => (
            <ThreadPostCard
              key={p.id}
              post={p}
              replies={childrenByParent.get(p.id) ?? []}
              meId={me?.id ?? null}
              onReact={react}
              onReply={startReply}
              canReply={!thread.topic.locked}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-3 mt-6 rounded-xl bg-card/95 backdrop-blur border border-border p-3 sm:p-4 shadow-lg">
        {replyTo && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
            <Reply className="h-3 w-3" /> Replying to {replyTo.name}
            <button onClick={() => setReplyTo(null)} className="ml-1 hover:text-amber-700" aria-label="Cancel reply">
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={replyBoxRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={thread.topic.locked ? "This topic is locked" : `Reply${role === "tutor" ? " as a tutor" : ""}…`}
            disabled={thread.topic.locked}
            maxLength={4000}
            rows={2}
            className="flex-1 rounded-2xl bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
          />
          <Button
            onClick={submit}
            disabled={busy || !reply.trim() || thread.topic.locked}
            aria-label="Send reply"
            className="h-11 w-11 rounded-2xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 shadow-lg shadow-amber-900/10"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ThreadPostCard({
  post, replies, meId, onReact, onReply, canReply,
}: {
  post: CommunityThreadPost;
  replies: CommunityThreadPost[];
  meId: string | null;
  onReact: (type: string, postId: string) => void;
  onReply: (parentId: string, name: string) => void;
  canReply: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-5">
      <ThreadPostBody post={post} meId={meId} onReact={onReact} onReply={canReply ? onReply : undefined} />
      {replies.length > 0 && (
        <div className="mt-3 ml-4 sm:ml-12 pl-3 sm:pl-4 border-l-2 border-border space-y-3">
          {replies.map((r) => (
            <ThreadPostBody
              key={r.id}
              post={r}
              meId={meId}
              compact
              onReact={onReact}
              // Replies thread one level deep: replying to a reply targets its parent.
              onReply={canReply ? () => onReply(post.id, r.author.name) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadPostBody({
  post, meId, compact = false, onReact, onReply,
}: {
  post: CommunityThreadPost;
  meId: string | null;
  compact?: boolean;
  onReact: (type: string, postId: string) => void;
  onReply?: (parentId: string, name: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {!compact && (
        <Link href={`/profile/${post.author.id}`} className="shrink-0">
          <Avatar src={post.author.avatar} name={post.author.name} role={post.author.role} />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/profile/${post.author.id}`} className="font-bold text-foreground text-sm hover:text-amber-600 dark:hover:text-amber-400">
            {post.author.name}
          </Link>
          {post.author.id === meId && <span className="text-[11px] text-amber-600 dark:text-amber-400">(you)</span>}
          {post.author.role === "TUTOR" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-amber-600 text-white">
              <Crown className="h-2.5 w-2.5" /> Tutor
            </span>
          )}
          <RelativeTime iso={post.createdAt} suffix className="text-[11px] text-muted-foreground" />
          {post.isAnswer && (
            <Pill icon={CheckCheck} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Answer</Pill>
          )}
        </div>
        <div className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{post.body}</div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {REACTIONS.map((r) => {
            const tally = post.reactions[r.type];
            // Unused reactions stay tucked away on replies to keep threads calm.
            if (!tally && compact) return null;
            return (
              <ReactionButton key={r.type} size="sm" active={tally?.mine} onClick={() => onReact(r.type, post.id)} label={r.label}>
                <span aria-hidden>{r.emoji}</span>
                {tally && <span className="ml-0.5 tabular-nums">{tally.count}</span>}
              </ReactionButton>
            );
          })}
          {compact && !post.reactions.heart && (
            <ReactionButton size="sm" onClick={() => onReact("heart", post.id)} label="Love">
              <Heart className="h-3 w-3" />
            </ReactionButton>
          )}
          {onReply && (
            <button
              onClick={() => onReply(post.id, post.author.name)}
              className="ml-1 inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReactionButton({
  children, onClick, active, size, label,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; size?: "sm" | "md"; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border transition font-bold",
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

const DRAFT_KEY = "edyfra:forum-topic-draft";

function readDraft(): { title: string; body: string; categoryId: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return typeof d?.title === "string" && typeof d?.body === "string"
      ? { title: d.title, body: d.body, categoryId: typeof d.categoryId === "string" ? d.categoryId : "" }
      : null;
  } catch {
    return null;
  }
}

function NewTopicDialog({
  categories, initialCategorySlug, onClose, onCreated,
}: {
  categories: Bootstrap["categories"];
  initialCategorySlug: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [draft] = useState(readDraft);
  const fallbackCategory =
    categories.find((c) => c.slug === initialCategorySlug)?.id ?? categories[0]?.id ?? "";
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [categoryId, setCategoryId] = useState(
    draft?.categoryId && categories.some((c) => c.id === draft.categoryId) ? draft.categoryId : fallbackCategory,
  );
  const [busy, setBusy] = useState(false);

  // Keep an unsent draft on this device so closing the dialog never loses it.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (title.trim() || body.trim()) {
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, categoryId }));
        } else {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        /* storage blocked — drafts just won't persist */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [title, body, categoryId]);

  const submit = async () => {
    setBusy(true);
    let res: Awaited<ReturnType<typeof createForumTopic>>;
    try {
      res = await createForumTopic({ title, body, categoryId });
    } catch {
      res = { ok: false, error: "Something hiccuped on our side." };
    } finally {
      setBusy(false);
    }
    if (!res.ok) { showError({ title: "We couldn't post that topic", cause: res.error, fix: "Try again, or refresh the page." }); return; }
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    showSuccess("Topic posted", { description: "Your question is live in the community." });
    onCreated(res.topicId);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.97 }}
          className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl p-6"
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
              <span>{title.trim() || body.trim() ? "Draft saved on this device" : ""}</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-lg text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 font-black text-xs uppercase tracking-widest px-5 h-10"
            >
              {busy ? "Posting…" : "Post topic"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
