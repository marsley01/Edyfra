"use client";

import { useState } from "react";
import { MessagesSquare, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunityFeed } from "./CommunityFeed";
import { CommunityForum } from "./CommunityForum";

type View = "feed" | "discussions";

/**
 * Dashboard community: a social feed (posts, likes, comments, follows) and the
 * threaded discussion forum, one tap apart. Both stay mounted once opened so
 * switching back is instant and keeps your scroll position and drafts.
 */
export function CommunityHub({
  role,
  basePath,
  initialView,
  initialSubject,
}: {
  role: "student" | "tutor";
  basePath: string;
  initialView: View;
  initialSubject: string | null;
}) {
  const [view, setViewState] = useState<View>(initialView);
  const [mounted, setMounted] = useState<Record<View, boolean>>({
    feed: initialView === "feed",
    discussions: initialView === "discussions",
  });

  const setView = (v: View) => {
    setViewState(v);
    setMounted((m) => ({ ...m, [v]: true }));
    try {
      const url = new URL(window.location.href);
      if (v === "discussions") url.searchParams.set("view", "discussions");
      else {
        url.searchParams.delete("view");
        url.searchParams.delete("topic");
      }
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* non-fatal */
    }
  };

  const tabs: Array<{ id: View; label: string; icon: typeof Rss }> = [
    { id: "feed", label: "Feed", icon: Rss },
    { id: "discussions", label: "Discussions", icon: MessagesSquare },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tighter">
            Edyfra <span className="text-primary">Community</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {view === "feed"
              ? "Follow classmates and tutors, share wins, ask quick questions."
              : "Longer questions and study threads, organised by subject."}
          </p>
        </div>
        <div role="tablist" aria-label="Community sections" className="inline-flex rounded-xl bg-secondary p-1 gap-1 self-start sm:self-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-black transition-all",
                view === id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {mounted.feed && (
        <div hidden={view !== "feed"}>
          <CommunityFeed initialTopic={initialSubject} showHeader={false} topicParam="subject" />
        </div>
      )}
      {mounted.discussions && (
        <div hidden={view !== "discussions"}>
          <CommunityForum role={role} basePath={basePath} embedded />
        </div>
      )}
    </div>
  );
}
