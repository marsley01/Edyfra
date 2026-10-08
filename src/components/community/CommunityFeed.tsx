"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hash, Newspaper, TrendingUp, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/social-utils";
import { getTrendingSubjects } from "@/app/actions/feed";
import { getMySocialSummary, getSuggestedPeople, type SocialUserDTO } from "@/app/actions/social";
import { SocialFeed, UserAvatar, FollowButton } from "./social-feed";
import type { FeedTab } from "@/app/actions/feed";

type Summary = Awaited<ReturnType<typeof getMySocialSummary>>;
type NewsItem = { id: string; title: string; slug: string; content: string; published_at?: string };

/**
 * Full-page community feed: profile card + feed + trending / people / news.
 * Every number on this page comes from the database; nothing is mocked.
 */
export function CommunityFeed({
  initialTopic = null,
  initialTab = "for-you",
  showNews = true,
}: {
  initialTopic?: string | null;
  initialTab?: FeedTab;
  showNews?: boolean;
}) {
  const [topic, setTopicState] = useState<string | null>(initialTopic);

  const setTopic = (t: string | null) => {
    setTopicState(t);
    try {
      const url = new URL(window.location.href);
      if (t) url.searchParams.set("topic", t);
      else url.searchParams.delete("topic");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* non-fatal */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-20 space-y-4">
          <MyCard />
        </div>
      </aside>

      <main className="lg:col-span-6 min-w-0">
        <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1">
          Community <span className="text-primary">Feed</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-3">Questions, wins and study tips from Edyfra students and tutors.</p>
        <SocialFeed topic={topic} onTopicChange={setTopic} initialTab={initialTab} />
      </main>

      <aside className="lg:col-span-3 space-y-4">
        <TrendingCard active={topic} onPick={setTopic} />
        <PeopleCard />
        {showNews && <NewsCard />}
      </aside>
    </div>
  );
}

function SideCard({ title, icon: Icon, children }: { title: string; icon: typeof Hash; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-foreground/80 mb-3">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function MyCard() {
  const [me, setMe] = useState<Summary | undefined>(undefined);
  useEffect(() => {
    getMySocialSummary()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (!me) return null;

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="h-14 bg-primary/10" />
      <div className="px-5 pb-5 -mt-8 text-center">
        <Link href={`/profile/${me.id}`} className="inline-block">
          <UserAvatar name={me.name} avatar={me.avatar} className="h-16 w-16 border-4 border-background mx-auto" />
        </Link>
        <Link href={`/profile/${me.id}`} className="block mt-2 font-black tracking-tight hover:text-primary truncate">
          {me.name}
        </Link>
        {me.username && <p className="text-xs text-muted-foreground font-semibold">@{me.username}</p>}
        <div className="mt-4 grid grid-cols-3 gap-1 text-center">
          {[
            ["Posts", me.postCount],
            ["Followers", me.followersCount],
            ["Following", me.followingCount],
          ].map(([label, n]) => (
            <Link key={label as string} href={`/profile/${me.id}`} className="rounded-lg py-2 hover:bg-secondary/60">
              <p className="text-base font-black tabular-nums">{formatCount(n as number)}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingCard({ active, onPick }: { active: string | null; onPick: (t: string | null) => void }) {
  const [topics, setTopics] = useState<Array<{ subject: string; posts: number }> | null>(null);
  useEffect(() => {
    getTrendingSubjects(6)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);

  return (
    <SideCard title="Trending subjects" icon={TrendingUp}>
      {topics === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tag a post with a subject to start a trend.</p>
      ) : (
        <ul className="space-y-0.5">
          {topics.map((t) => (
            <li key={t.subject}>
              <button
                type="button"
                onClick={() => onPick(active === t.subject ? null : t.subject)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  active === t.subject ? "bg-primary/10 text-primary" : "hover:bg-secondary/60"
                }`}
              >
                <span className="text-sm font-bold truncate">#{t.subject}</span>
                <span className="text-[10px] font-black text-muted-foreground tabular-nums shrink-0">
                  {formatCount(t.posts)} {t.posts === 1 ? "post" : "posts"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SideCard>
  );
}

function PeopleCard() {
  const [people, setPeople] = useState<SocialUserDTO[] | null>(null);
  useEffect(() => {
    getSuggestedPeople(5)
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  if (people && people.length === 0) return null;

  return (
    <SideCard title="People to follow" icon={UserPlus}>
      {people === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Link href={`/profile/${p.id}`} className="shrink-0">
                <UserAvatar name={p.name} avatar={p.avatar} className="h-9 w-9" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${p.id}`} className="block text-sm font-bold truncate hover:text-primary">
                  {p.name}
                </Link>
                <p className="text-[10px] font-bold text-muted-foreground truncate">
                  {p.followsYou ? "Follows you" : p.role === "TUTOR" ? "Tutor" : p.username ? `@${p.username}` : "Student"}
                </p>
              </div>
              <FollowButton userId={p.id} initial={p.isFollowing} size="xs" />
            </li>
          ))}
        </ul>
      )}
    </SideCard>
  );
}

function NewsCard() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    import("@/app/actions/news")
      .then(({ getLatestNews }) => getLatestNews(4))
      .then((items) => setNews(items as NewsItem[]))
      .catch(() => setNews([]));
  }, []);

  if (news && news.length === 0) return null;

  return (
    <SideCard title="Latest news" icon={Newspaper}>
      {news === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {news.map((a) => {
            const external = a.slug.startsWith("rss");
            if (external && !/^https?:\/\//i.test(a.content)) return null;
            return (
              <li key={a.id}>
                <a
                  href={external ? a.content : `/news/${a.slug}`}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="block rounded-lg px-2 py-1.5 text-sm font-semibold leading-snug hover:bg-secondary/60 hover:text-primary line-clamp-2"
                >
                  {a.title}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </SideCard>
  );
}
