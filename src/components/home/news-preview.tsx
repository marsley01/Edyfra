"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, Newspaper, RefreshCw, ArrowUpRight } from "lucide-react";
import { getLatestNews, NewsArticle } from "@/app/actions/news";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

const categoryColors: Record<string, string> = {
  Tech: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Education: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Student Life": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Announcements: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Global Updates": "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

/** Skeleton card while loading */
function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-3xl border border-border bg-secondary/20 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 rounded-full bg-secondary" />
        <div className="h-4 w-16 rounded-full bg-secondary" />
      </div>
      <div className="space-y-2">
        <div className="h-6 rounded-xl bg-secondary" />
        <div className="h-6 w-4/5 rounded-xl bg-secondary" />
      </div>
      <div className="h-4 w-full rounded bg-secondary" />
      <div className="h-4 w-3/4 rounded bg-secondary" />
    </div>
  );
}

/** Single news card — text-only, no per-article image */
function NewsCard({ item, index }: { item: NewsArticle; index: number }) {
  const isExternal = item.slug.startsWith("rss");
  const href = isExternal ? item.content : `/news/${item.slug}`;
  const colorClass = categoryColors[item.category] ?? "bg-primary/10 text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        href={href}
        target={isExternal ? "_blank" : "_self"}
        rel="noopener noreferrer"
        className="group flex flex-col gap-5 p-6 rounded-3xl border border-border/60 bg-card hover:bg-secondary/30 hover:border-border hover:-translate-y-1 hover:shadow-xl transition-all duration-400 h-full"
      >
        {/* Category + Date */}
        <div className="flex items-center justify-between gap-3">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
            {item.category}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3" />
            {new Date(item.published_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-3 flex-1">
          {item.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
          {item.excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-[9px] uppercase">
              {item.author?.[0] ?? "E"}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate max-w-[120px]">
              {item.author}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Read {isExternal ? <ArrowUpRight className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        </div>
      </a>
    </motion.div>
  );
}

export function HomeNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadNews = async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setHasError(false);

    try {
      const data = await getLatestNews(3);
      if (!controller.signal.aborted) {
        setNews(data);
      }
    } catch (e: unknown) {
      if (!controller.signal.aborted) {
        console.error("News load failed:", e);
        setHasError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNews();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="py-32 md:py-48 bg-background">
      <div className="container-max space-y-16">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              <Newspaper className="h-3.5 w-3.5" />
              <span>News Room</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Latest from Edyfra.</h2>
            <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
              News, platform notes, and study updates worth checking before your next session.
            </p>
          </div>
          <Link href="/news">
            <Button
              variant="ghost"
              className="font-black text-[10px] tracking-widest uppercase text-primary hover:text-primary group"
            >
              Open News Room <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <NewsSkeleton key={i} />)}
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center gap-6 py-20 text-center">
            <p className="text-muted-foreground font-medium">Couldn&apos;t load the latest news. Check your connection and try again.</p>
            <Button variant="outline" onClick={loadNews} className="rounded-full gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="News Room Warming Up"
            description="We are preparing fresh education updates. Check back soon, or refresh if you just added articles."
            actionText="Refresh Feed"
            onAction={loadNews}
          />
        )}
      </div>
    </section>
  );
}
