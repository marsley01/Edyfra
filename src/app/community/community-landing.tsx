"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crown, Hash, Heart, MessageSquare, Plus, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlobDecor } from "@/components/ui/blob-decor";
import { MiniBlobs } from "@/components/ui/mini-blobs";
import { UserAvatar } from "@/components/community/social-feed";
import { RelativeTime } from "@/components/community/relative-time";
import { formatCount } from "@/lib/social-utils";
import type { PublicCommunitySnapshot } from "@/app/actions/forum";

export function CommunityLanding({ snapshot }: { snapshot: PublicCommunitySnapshot }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);

  const posts = useMemo(() => {
    let list = snapshot.posts;
    if (subject) list = list.filter((p) => p.subject === subject);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          (p.subject ?? "").toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [snapshot.posts, query, subject]);

  const { totals } = snapshot;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border pt-32 pb-14 px-6 bg-gradient-to-br from-brand-orange/[0.06] via-background to-coral/[0.06]">
        <BlobDecor variant="mixed" />
        <div className="container-max relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-card/70 border border-border text-[10px] font-black uppercase tracking-[0.22em] text-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                Edyfra Community
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-[0.95]">
                <span className="bg-gradient-to-br from-brand-orange via-orange-500 to-brand-orange bg-clip-text text-transparent">
                  Your people
                </span>
                <br />
                <span className="text-foreground">are studying right now.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground font-medium max-w-xl">
                Drop a question, share a win, find your study crew. Real Kenyan students and tutors helping each other level up.
              </p>
              {totals.posts30d > 0 && (
                <p className="text-sm font-bold text-foreground/80">
                  {formatCount(totals.posts30d)} {totals.posts30d === 1 ? "post" : "posts"} from{" "}
                  {formatCount(totals.members30d)} {totals.members30d === 1 ? "member" : "members"} in the last 30 days
                </p>
              )}
            </div>
            <Link href="/dashboard/community" className="shrink-0">
              <Button className="h-14 px-8 rounded-lg bg-gradient-to-br from-brand-orange via-orange-500 to-coral text-white hover:brightness-110 font-black text-xs tracking-widest uppercase shadow-lg active:scale-95">
                <Plus className="h-4 w-4 mr-1.5" /> Join the conversation
              </Button>
            </Link>
          </div>

          <div className="relative max-w-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search recent discussions, subjects or people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-14 pl-14 rounded-xl bg-card/80 backdrop-blur-xl border-border shadow-md text-base"
            />
          </div>
        </div>
      </div>

      <div className="container-max mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 px-6">
        <div className="lg:col-span-8 space-y-8">
          {/* Subjects */}
          {snapshot.subjects.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Hash className="h-5 w-5 text-brand-orange" /> Subjects people are talking about
              </h2>
              <div className="flex flex-wrap gap-2">
                <SubjectChip active={subject === null} onClick={() => setSubject(null)}>
                  All
                </SubjectChip>
                {snapshot.subjects.map((s) => (
                  <SubjectChip key={s.subject} active={subject === s.subject} onClick={() => setSubject(subject === s.subject ? null : s.subject)}>
                    #{s.subject}
                    <span className="ml-1.5 text-[10px] font-black opacity-60 tabular-nums">{formatCount(s.posts)}</span>
                  </SubjectChip>
                ))}
              </div>
            </section>
          )}

          {/* Recent posts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-orange" />
                {subject ? `Recent in ${subject}` : "Fresh discussions"}
              </h2>
              <Link
                href={subject ? `/dashboard/community?subject=${encodeURIComponent(subject)}` : "/dashboard/community"}
                className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline"
              >
                Open feed →
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {posts.length === 0 ? (
                <div className="py-16 px-6 text-center">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-black">
                    {snapshot.posts.length === 0 ? "No discussions yet" : "Nothing matches that"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {snapshot.posts.length === 0 ? "Be the first to start one." : "Try another word or subject."}
                  </p>
                </div>
              ) : (
                posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/profile/${p.author.id}?post=${p.id}`}
                    className="group flex items-start gap-3.5 p-4 sm:p-5 hover:bg-secondary/50 transition-colors"
                  >
                    <UserAvatar name={p.author.name} avatar={p.author.avatar} className="h-10 w-10 sm:h-11 sm:w-11" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-black text-foreground truncate">{p.author.name}</span>
                        {p.author.role === "TUTOR" && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Tutor
                          </span>
                        )}
                        <span className="text-muted-foreground">·</span>
                        <RelativeTime iso={p.createdAt} suffix className="text-[11px] text-muted-foreground" />
                        {p.subject && (
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">#{p.subject}</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-3 leading-snug whitespace-pre-wrap break-words">{p.content}</p>
                      <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" /> {formatCount(p.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> {formatCount(p.comments)}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {snapshot.contributors.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
              <MiniBlobs palette={1} />
              <h3 className="relative text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-primary" /> Top contributors
                <span className="ml-auto text-[10px] text-muted-foreground">30 days</span>
              </h3>
              <ul className="relative space-y-2.5">
                {snapshot.contributors.map((u, i) => (
                  <li key={u.id}>
                    <Link href={`/profile/${u.id}`} className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 hover:bg-secondary/60 transition-colors">
                      <UserAvatar name={u.name} avatar={u.avatar} className="h-9 w-9" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">
                          {u.posts} {u.posts === 1 ? "post" : "posts"}
                          {u.role === "TUTOR" ? " · Tutor" : ""}
                        </p>
                      </div>
                      {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <MiniBlobs palette={0} />
            <h3 className="relative text-sm font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4" /> Community code
            </h3>
            <ul className="relative space-y-2 text-xs text-foreground/80 leading-relaxed">
              {[
                "Be kind and hype each other up.",
                "Stay on-topic: education first.",
                "Search before you post.",
                "No spam, no promo, no personal data in public.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center h-9 px-3.5 rounded-lg border text-xs font-bold transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
