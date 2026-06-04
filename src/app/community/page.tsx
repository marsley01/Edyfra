"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Calculator,
  FlaskConical,
  Code2,
  GraduationCap,
  Building2,
  Coffee,
  Search,
  ChevronRight,
  Users,
  Loader2,
  Sparkles,
  Heart,
  Eye,
  Pin,
  Flame,
  TrendingUp,
  Crown,
  Zap,
  ArrowUpRight,
  Star,
  Plus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LottieAnimation } from "@/components/lottie-animation";
import { getPublicPosts } from "@/app/actions/forum";

type Category = {
  id: string;
  name: string;
  description: string;
  icon: any;
  gradient: string;
  members: number;
  posts: number;
  emoji: string;
  hot?: boolean;
};

const FORUM_CATEGORIES: Category[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    description: "Calculus, Algebra, Geometry, and everything numbers.",
    icon: Calculator,
    gradient: "from-blue-500 via-indigo-500 to-violet-600",
    members: 2840,
    posts: 1274,
    emoji: "🧮",
    hot: true,
  },
  {
    id: "sciences",
    name: "Sciences",
    description: "Physics, Chemistry, Biology — experiments & theory.",
    icon: FlaskConical,
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    members: 1920,
    posts: 870,
    emoji: "🔬",
  },
  {
    id: "tech",
    name: "Tech & Coding",
    description: "Programming, Computer Science, IT & AI.",
    icon: Code2,
    gradient: "from-violet-500 via-fuchsia-500 to-pink-600",
    members: 3210,
    posts: 2110,
    emoji: "💻",
    hot: true,
  },
  {
    id: "kcse",
    name: "KCSE Prep",
    description: "Past papers, revision strategies & national exam tips.",
    icon: GraduationCap,
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    members: 4520,
    posts: 3290,
    emoji: "📚",
    hot: true,
  },
  {
    id: "university",
    name: "University Admissions",
    description: "KUCCPS, course selection, campus life advice.",
    icon: Building2,
    gradient: "from-pink-500 via-rose-500 to-red-600",
    members: 1410,
    posts: 612,
    emoji: "🎓",
  },
  {
    id: "general",
    name: "General Chat",
    description: "Off-topic, study motivation & networking.",
    icon: Coffee,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    members: 5680,
    posts: 4120,
    emoji: "☕",
  },
];

const TRENDING_TAGS = [
  { tag: "KCSE 2026", count: 412, color: "from-rose-500 to-pink-500" },
  { tag: "Calculus", count: 287, color: "from-blue-500 to-violet-500" },
  { tag: "Scholarships", count: 234, color: "from-emerald-500 to-cyan-500" },
  { tag: "AI in Education", count: 198, color: "from-violet-500 to-fuchsia-500" },
  { tag: "KUCCPS", count: 167, color: "from-amber-500 to-orange-500" },
  { tag: "Python", count: 142, color: "from-cyan-500 to-blue-500" },
];

const STORIES = [
  { id: 1, name: "Wanjiku", color: "from-rose-500 to-pink-500", emoji: "🌸" },
  { id: 2, name: "Brian", color: "from-cyan-500 to-blue-500", emoji: "🚀" },
  { id: 3, name: "Akinyi", color: "from-violet-500 to-fuchsia-500", emoji: "✨" },
  { id: 4, name: "Kiprop", color: "from-emerald-500 to-teal-500", emoji: "📐" },
  { id: 5, name: "Mumbi", color: "from-amber-500 to-orange-500", emoji: "🌟" },
  { id: 6, name: "Otieno", color: "from-pink-500 to-rose-500", emoji: "🎯" },
  { id: 7, name: "Achieng", color: "from-indigo-500 to-violet-500", emoji: "🧠" },
];

const ACTIVE_USERS = [
  { name: "Wanjiku K.", points: 1240, color: "from-rose-500 to-pink-500", online: true },
  { name: "Brian M.", points: 1180, color: "from-cyan-500 to-blue-500", online: true },
  { name: "Akinyi O.", points: 980, color: "from-violet-500 to-fuchsia-500", online: true },
  { name: "Kiprop L.", points: 870, color: "from-emerald-500 to-teal-500", online: false },
  { name: "Mumbi N.", points: 760, color: "from-amber-500 to-orange-500", online: true },
];

export default function ForumPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function loadRecentDiscussions() {
      try {
        const data = await getPublicPosts(20);
        setPosts(data || []);
      } catch (err) {
        console.error("Failed to load forum posts", err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    loadRecentDiscussions();
  }, []);

  const filteredPosts = useMemo(() => {
    let list = posts || [];
    if (activeCategory !== "all") {
      const cat = FORUM_CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) {
        list = list.filter(
          (p) =>
            p.subject?.toLowerCase().includes(cat.name.toLowerCase()) ||
            p.content?.toLowerCase().includes(cat.name.toLowerCase()),
        );
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          (p.subject && p.subject.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [posts, searchQuery, activeCategory]);

  const featured = filteredPosts[0];
  const rest = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Vibrant hero — light + dark */}
      <div className="relative overflow-hidden border-b border-border pt-32 pb-16 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 -left-20 h-80 w-80 rounded-full bg-rose-500/10 dark:bg-rose-500/15 blur-3xl" />
          <div className="absolute top-32 -right-20 h-96 w-96 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
        </div>

        <div className="container-max relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-cyan-500/10 dark:from-rose-500/15 dark:via-violet-500/15 dark:to-cyan-500/15 border border-border text-[10px] font-black uppercase tracking-[0.22em] text-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-300" />
                Edyfra Community
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-300">live</span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-[0.95]">
                <span className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                  Your people
                </span>
                <br />
                <span className="text-foreground">are studying right now.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground font-medium max-w-xl">
                Drop a question, share a win, find your tribe. Real Kenyan students
                and tutors — talking, helping, levelling up together.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/dashboard/feed">
                <Button className="h-14 px-8 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 text-white hover:brightness-110 font-black text-xs tracking-widest uppercase shadow-[0_0_32px_rgba(244,63,94,0.35)] dark:shadow-[0_0_32px_rgba(244,63,94,0.45)] transition-all active:scale-95">
                  <Plus className="h-4 w-4 mr-1.5" /> Start a Post
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-14 px-6 rounded-2xl border-border bg-card hover:bg-secondary text-foreground font-black text-xs tracking-widest uppercase backdrop-blur"
              >
                <Bell className="h-4 w-4 mr-1.5" /> Follow
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search discussions, subjects, or topics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-14 pr-32 rounded-2xl bg-card/80 backdrop-blur-xl border-border shadow-md dark:shadow-lg text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-fuchsia-400/40"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          {/* Stories row */}
          <div className="mt-10 flex items-center gap-4 overflow-x-auto pb-2 -mx-6 px-6">
            <button className="relative shrink-0 group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 p-[2px] group-hover:scale-105 transition-transform">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <Plus className="h-6 w-6 text-rose-500" />
                </div>
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-background text-[8px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300 border border-rose-500/30 whitespace-nowrap">
                You
              </span>
            </button>
            {STORIES.map((s) => (
              <button
                key={s.id}
                className="relative shrink-0 group"
                aria-label={`${s.name}'s story`}
              >
                <div
                  className={`h-16 w-16 rounded-full bg-gradient-to-br ${s.color} p-[2.5px] group-hover:scale-105 transition-transform`}
                >
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-2xl">
                    {s.emoji}
                  </div>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-background text-[8px] font-black uppercase tracking-widest text-muted-foreground border border-border whitespace-nowrap max-w-[64px] truncate">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-max mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 px-6">
        {/* Main feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Categories — vibrant cards (theme-aware) */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-500" />
                Categories
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  tap to filter
                </span>
              </h2>
              {activeCategory !== "all" && (
                <button
                  onClick={() => setActiveCategory("all")}
                  className="text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {FORUM_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(active ? "all" : cat.id)}
                    className={`group relative overflow-hidden text-left rounded-3xl border ${
                      active
                        ? "border-primary/50 shadow-lg"
                        : "border-border hover:border-primary/40"
                    } bg-card transition-all hover:-translate-y-0.5 hover:shadow-xl`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} ${
                        active ? "opacity-15" : "opacity-0"
                      } group-hover:opacity-10 transition-opacity`}
                    />
                    <div className="relative p-4 flex items-center gap-3.5">
                      <div
                        className={`h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white shadow-lg`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{cat.emoji}</span>
                          <h3 className="font-black text-sm text-foreground truncate">
                            {cat.name}
                          </h3>
                          {cat.hot && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-300 text-[8px] font-black uppercase tracking-widest">
                              <Flame className="h-2.5 w-2.5" />
                              hot
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {cat.description}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {cat.members.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-2.5 w-2.5" />
                            {cat.posts.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-all ${
                          active
                            ? "translate-x-0 text-primary"
                            : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Trending tags */}
          <section className="space-y-4">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Trending now
            </h2>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((t) => (
                <Link
                  key={t.tag}
                  href={`/dashboard/feed?topic=${encodeURIComponent(t.tag)}`}
                  className="group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-card border border-border hover:border-primary/40 transition-all hover:shadow-sm"
                >
                  <span
                    className={`h-6 w-6 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center`}
                  >
                    <Zap className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-xs font-bold text-foreground">#{t.tag}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest tabular-nums">
                    {t.count}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Featured post */}
          {featured && !searchQuery && activeCategory === "all" && (
            <section className="space-y-3">
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Featured today
              </h2>
              <Link
                href="/dashboard/feed"
                className="group block relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-500/5 via-violet-500/5 to-cyan-500/5 dark:from-rose-500/10 dark:via-violet-500/10 dark:to-cyan-500/10 p-6 hover:border-primary/40 transition-all hover:shadow-xl"
              >
                <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-rose-500/10 dark:bg-rose-500/20 blur-3xl" />
                <div className="relative flex items-start gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-500 flex items-center justify-center text-white font-black ring-2 ring-border">
                    {featured.user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Pin className="h-2.5 w-2.5" /> Pinned
                      </span>
                      <span className="text-xs font-black text-foreground truncate">
                        {featured.user.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {formatDistanceToNow(new Date(featured.createdAt))} ago
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground line-clamp-2 leading-snug">
                      {featured.content}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {featured._count.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {featured.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {Math.floor(featured.likes * 14.7)}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:rotate-45 transition-all" />
                </div>
              </Link>
            </section>
          )}

          {/* Recent discussions */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                {activeCategory !== "all"
                  ? `${FORUM_CATEGORIES.find((c) => c.id === activeCategory)?.name} Discussions`
                  : "Fresh discussions"}
              </h2>
              <Link
                href="/dashboard/feed"
                className="text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                See all →
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-rose-500" />
                  <p className="text-xs font-black uppercase tracking-widest">
                    Loading latest posts...
                  </p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <EmptyState
                  title="No discussions found"
                  description="Try a different filter or start a new topic."
                />
              ) : (
                <div className="divide-y divide-border">
                  {(featured && !searchQuery && activeCategory === "all" ? rest : filteredPosts).map(
                    (post, i) => (
                      <Link
                        key={post.id}
                        href="/dashboard/feed"
                        className="group flex items-start gap-3.5 p-4 sm:p-5 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-rose-500/40 to-violet-500/40">
                          <Avatar className="h-full w-full rounded-2xl">
                            <AvatarImage src={post.user.avatar || undefined} />
                            <AvatarFallback className="text-sm font-black text-white bg-gradient-to-br from-rose-500 to-violet-500">
                              {post.user.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 rounded-full px-2 py-0.5">
                              {post.subject || "General"}
                            </span>
                            <span className="text-xs font-black text-foreground truncate">
                              {post.user.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {formatDistanceToNow(new Date(post.createdAt))} ago
                            </span>
                            {i < 2 && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-300 bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                                <Flame className="h-2.5 w-2.5" />
                                new
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-foreground/90 line-clamp-2 leading-snug group-hover:text-rose-500 transition-colors">
                            {post.content}
                          </h4>
                          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post._count.comments}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {post.likes}
                            </span>
                            <span className="flex items-center gap-1 hidden sm:flex">
                              <Eye className="h-3 w-3" />
                              {Math.floor(post.likes * 14.7)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground -translate-x-1 group-hover:translate-x-0 group-hover:text-foreground transition-all mt-1 shrink-0" />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Active users */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-transparent dark:from-emerald-500/10 dark:via-cyan-500/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Online now
              </h3>
              <span className="text-[10px] font-black text-muted-foreground">3 active</span>
            </div>
            <div className="space-y-2.5">
              {ACTIVE_USERS.slice(0, 4).map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-card ring-1 ring-border">
                    <div
                      className={`h-full w-full bg-gradient-to-br ${u.color} flex items-center justify-center text-white text-xs font-black`}
                    >
                      {u.name[0]}
                    </div>
                    {u.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground truncate">
                      {u.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {u.points.toLocaleString()} pts
                    </p>
                  </div>
                  {i === 0 && (
                    <Crown className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Community guidelines */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-500/5 via-fuchsia-500/5 to-transparent dark:from-rose-500/10 dark:via-fuchsia-500/5 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-rose-600 dark:text-rose-300 mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Vibe check
            </h3>
            <ul className="space-y-2.5 text-xs text-foreground/80 leading-relaxed">
              {[
                "Be kind, hype each other up.",
                "Stay on-topic — education first.",
                "Search before you post.",
                "No spam, no promo.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={`h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 bg-gradient-to-br ${
                      ["from-rose-500 to-pink-500", "from-violet-500 to-fuchsia-500", "from-cyan-500 to-blue-500", "from-emerald-500 to-teal-500"][i]
                    } text-white`}
                  >
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/feed" className="block mt-4">
              <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-black text-[10px] tracking-widest uppercase">
                Read full guidelines
              </Button>
            </Link>
          </div>

          {/* Fun stat card */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-cyan-500/5 via-violet-500/5 to-pink-500/5 dark:from-cyan-500/15 dark:via-violet-500/10 dark:to-pink-500/10 p-5">
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-400/15 dark:bg-cyan-400/20 blur-2xl" />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 mb-1">
                This week
              </p>
              <p className="text-3xl font-black text-foreground tracking-tightest">
                +1,284
              </p>
              <p className="text-xs text-muted-foreground mb-3">new posts from across Kenya 🇰🇪</p>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-300">
                <TrendingUp className="h-3 w-3" />
                <span>↑ 23% vs last week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-20 text-center space-y-4">
      <div className="w-32 h-32 mx-auto opacity-80">
        <LottieAnimation
          url="/animations/no-messages.json"
          ariaLabel="Nothing here yet"
        />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground font-medium">{description}</p>
      </div>
    </div>
  );
}
