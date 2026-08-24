"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YouTube from "react-youtube";
import { Bell, Loader2, Play, Search, X } from "lucide-react";
import { BlobDecor } from "@/components/ui/blob-decor";

const SubjectGraph = dynamic(
  () => import("@/components/three/SubjectGraph").then((m) => m.SubjectGraph),
  { ssr: false }
);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: EASE },
});

const scaleIn = (delay: number) => ({
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, delay, ease: EASE },
});

type VideoResult = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
};

const QUICK_TOPICS = [
  // Secondary / KCSE
  "KCSE Maths",
  "KCSE Chemistry",
  "Biology revision",
  "Kiswahili Fasihi",
  "Physics paper 1",
  // CBC (junior & senior secondary)
  "CBC Grade 7 Science",
  "CBC Grade 9 Mathematics",
  "CBC Grade 10 Chemistry",
  // University / campus
  "Calculus",
  "Computer Networking",
  "Financial Accounting",
  "Human Anatomy",
  "Contract Law",
  "Data Science",
];

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const watchStartedAt = useRef<number | null>(null);
  const watchedMs = useRef(0);

  const finalizeWatch = () => {
    if (watchStartedAt.current) {
      watchedMs.current += Date.now() - watchStartedAt.current;
      watchStartedAt.current = null;
    }
    if (watchedMs.current >= 30000) {
      setShowBanner(true);
    }
  };

  const closeVideo = () => {
    finalizeWatch();
    setActiveVideo(null);
  };

  const openVideo = (video: VideoResult) => {
    watchedMs.current = 0;
    watchStartedAt.current = null;
    setPlayerError(null);
    setActiveVideo(video);
  };

  // Some channels disable embedding (YT error codes 101/150) and some videos
  // are gone (100/2). Skip to the next playable result automatically.
  const handlePlayerError = (event: { data: number }) => {
    if (!activeVideo || !results) return;
    const idx = results.findIndex((v) => v.id === activeVideo.id);
    const next = results.find((v, i) => i > idx);
    const first = results[0];
    const fallback = next ?? (first.id !== activeVideo.id ? first : null);
    if (fallback) {
      setPlayerError(
        `"${activeVideo.title.slice(0, 60)}${activeVideo.title.length > 60 ? "…" : ""}" can't be embedded — playing the next video instead.`
      );
      setTimeout(() => openVideo(fallback), 1200);
    } else {
      setPlayerError("This video can't be embedded. Try another one from the results.");
    }
  };

  const onPlayerStateChange = (event: { data: number }) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      watchStartedAt.current = Date.now();
    } else if (watchStartedAt.current) {
      finalizeWatch();
    }
  };

  useEffect(() => {
    if (!activeVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeVideo]);

  const runSearch = async (rawQuery: string, opts?: { silent?: boolean }) => {
    const q = rawQuery.trim();
    if (!q || searching) return;
    const silent = Boolean(opts?.silent);

    setSearching(true);
    if (!silent) setError(null);

    try {
      // Always goes through our own /api/youtube/search proxy, so only the
      // SERVER-side YOUTUBE_API_KEY needs to be configured in production.
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (!silent) setError(data.error || "Search failed. Please try again.");
        return;
      }

      const items: VideoResult[] = data.items ?? [];
      if (items.length === 0) {
        if (!silent) setError("No videos found for that query. Try a different subject.");
        return;
      }
      setResults(items);
    } catch {
      if (!silent) setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  // Show real study videos straight away — a preview sits under the
  // search bar before the visitor types anything. Runs through the server
  // proxy and fails silently (no error banner for passive content).
  useEffect(() => {
    if (results === null) {
      void runSearch("KCSE Mathematics revision", { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Solid colorful blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <BlobDecor variant="mixed" />
        <div className="hero-pattern absolute inset-0 opacity-20" />
      </div>

      {/* 3D subject constellation — full-bleed on mobile, right half on desktop */}
      <SubjectGraph className="pointer-events-none absolute inset-y-0 right-0 z-0 h-full w-full opacity-35 sm:opacity-50 lg:w-[55%] lg:opacity-100" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 pb-lg pt-16 text-center md:px-16 md:pt-24">
        {/* CSS-only entrance — LCP text must not wait for JS hydration */}
        <h1
          className="hero-rise mb-6 max-w-4xl bg-gradient-to-r from-brand-orange to-[#ffc107] bg-clip-text text-display-lg font-black tracking-tight text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] md:text-[72px] md:leading-[80px]"
          style={{ animationDelay: "0.1s" }}
        >
          Study Smarter,
          <br />
          Not Harder.
        </h1>

        <p
          className="hero-rise mx-auto mb-12 max-w-3xl text-balance font-medium text-body-lg text-on-surface-variant md:text-2xl md:leading-9"
          style={{ animationDelay: "0.25s" }}
        >
          Education, reimagined. Your personal study base for school, revision, mentorship, and
          momentum. Mash AI, verified tutors, and real students help you move from stuck to ready.
        </p>

        <motion.div
          {...scaleIn(0.45)}
          className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row md:gap-6"
        >
          <Link
            href="/signup"
            className="primary-glow primary-glow-hover transition-smooth inline-flex w-full items-center justify-center rounded-full bg-brand-orange px-12 py-6 text-title-md font-bold text-deep-void hover:bg-brand-orange-dark sm:w-auto"
          >
            Create My Study Space
          </Link>
          <a
            href="https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P"
            target="_blank"
            rel="noreferrer"
            className="glass-panel transition-smooth inline-flex w-full items-center justify-center gap-3 rounded-full px-12 py-6 text-title-md font-semibold text-on-surface hover:bg-glass-fill hover:text-brand-orange sm:w-auto"
          >
            <Bell className="h-5 w-5" />
            Join Student Updates
          </a>
        </motion.div>

        <motion.p {...fadeUp(0.6)} className="mt-12 text-label-md text-outline">
          Built for Kenyan students, from Form 1 to final year. Access 700+ papers instantly.
        </motion.p>

        <motion.form
          {...fadeUp(0.7)}
          role="search"
          onSubmit={handleSearch}
          className="mx-auto mt-10 w-full max-w-2xl"
        >
          <div className="glass-panel flex items-center gap-2 rounded-full p-2 pl-6 transition-colors focus-within:border-brand-orange/60">
            <Search className="h-5 w-5 shrink-0 text-outline" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search study videos e.g. KCSE Math, Biology, Networking..."
              aria-label="Search study videos"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline-variant"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-orange px-6 text-sm font-bold text-deep-void transition-all duration-200 hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
          </div>

          {/* One-tap topics */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setQuery(topic);
                  void runSearch(topic);
                }}
                className="rounded-full border border-glass-stroke bg-secondary/60 px-4 py-1.5 text-xs font-bold text-on-surface-variant transition-all duration-200 hover:border-brand-orange/50 hover:text-brand-orange active:scale-95"
              >
                {topic}
              </button>
            ))}
          </div>
        </motion.form>
      </div>

      {/* Search results / instant preview */}
      {(results || error) && (
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 md:px-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title-md font-bold text-on-surface md:text-2xl">
              {query.trim() ? "Study videos" : "Trending study videos"}
            </h2>
            {results && results.length > 0 && (
              <span className="text-label-sm text-outline">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {results && results.length > 0 && (
            <div className="mt-gutter grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
              {results.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => openVideo(video)}
                  className="glass-panel group overflow-hidden rounded-xl text-left transition-colors duration-200 hover:border-brand-orange/50"
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-container-lowest">
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                        onError={(e) => {
                          // hqdefault is missing/blocked for some videos — mqdefault always exists
                          const img = e.currentTarget;
                          if (img.src.includes("hqdefault")) {
                            img.src = img.src.replace("hqdefault", "mqdefault");
                          } else {
                            img.style.visibility = "hidden";
                          }
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/90">
                        <Play className="h-5 w-5 fill-deep-void text-deep-void" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 p-6">
                    <p className="line-clamp-2 text-[15px] font-medium leading-snug text-on-surface">
                      {video.title}
                    </p>
                    <p className="text-label-sm text-outline">{video.channel}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeVideo.title}
          onClick={closeVideo}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-xl border border-glass-stroke bg-surface-container-lowest shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full bg-black">
              <YouTube
                videoId={activeVideo.id}
                className="absolute inset-0 h-full w-full"
                iframeClassName="h-full w-full"
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    autoplay: 1,
                    rel: 0,
                    playsinline: 1,
                    origin: typeof window !== "undefined" ? window.location.origin : undefined,
                  },
                }}
                onStateChange={onPlayerStateChange}
                onEnd={finalizeWatch}
                onError={handlePlayerError}
              />
              {playerError && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/80 px-6 py-3 text-center">
                  <p className="text-xs font-semibold text-white/90">{playerError}</p>
                </div>
              )}
            </div>
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-on-surface">
                  {activeVideo.title}
                </p>
                <p className="text-label-sm text-outline">{activeVideo.channel}</p>
              </div>
              <button
                type="button"
                onClick={closeVideo}
                aria-label="Close video"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-glass-stroke text-on-surface transition-colors duration-200 hover:border-brand-orange"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking study banner after 30s of watching */}
      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4">
          <div className="flex w-full max-w-2xl items-center justify-between gap-4 rounded-xl border border-glass-stroke bg-surface-container-low/95 px-6 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] backdrop-blur">
            <p className="text-[14px] leading-snug text-on-surface">
              Study smarter — get personalized content on{" "}
              <span className="font-semibold text-brand-orange">Edyfra</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/auth/register"
                className="inline-flex h-9 items-center justify-center rounded-full bg-brand-orange px-4 text-[13px] font-bold text-deep-void transition-all duration-200 hover:bg-brand-orange-dark"
              >
                Sign Up
              </Link>
              <button
                type="button"
                onClick={() => setShowBanner(false)}
                aria-label="Dismiss banner"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
