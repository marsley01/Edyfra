"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { ArrowRight, Bell, Loader2, Play, Search, X } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

// A short mix of secondary (KCSE and CBC) and campus topics. The old list
// had 14 pills, which wrapped into three rows and buried the search box.
const QUICK_TOPICS = [
  "KCSE Maths",
  "Biology revision",
  "Kiswahili Fasihi",
  "CBC Grade 9 Maths",
  "Calculus",
  "Financial Accounting",
];

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const reduceMotion = useReducedMotion();

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
        `"${activeVideo.title.slice(0, 60)}${activeVideo.title.length > 60 ? "…" : ""}" can't be embedded. Playing the next video instead.`
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
      {/* A faint dot grid. The old hero layered four unrelated blobs and a
          full-bleed 3D graph behind the copy, so shapes floated over the
          buttons and the search box. The bubbles now live behind the card. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-pattern absolute inset-0 opacity-[0.12]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-14 pt-8 sm:px-6 md:pt-14 lg:min-h-[min(calc(100dvh-4rem),720px)] lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:pb-8 lg:pt-6">
        {/* Message. CSS-only entrance so the LCP text never waits for hydration. */}
        <div className="text-center lg:text-left">
          <h1
            className="hero-rise text-[2.75rem] font-black leading-[1.04] tracking-tight text-on-surface sm:text-6xl xl:text-7xl"
            style={{ animationDelay: "0.05s" }}
          >
            From stuck to <span className="block whitespace-nowrap text-brand-orange">exam-ready.</span>
          </h1>

          <p
            className="hero-rise mx-auto mt-6 max-w-[36ch] text-lg leading-relaxed text-on-surface-variant sm:text-xl lg:mx-0"
            style={{ animationDelay: "0.15s" }}
          >
            Verified tutors, study partners, past papers and Mash AI, built for Kenyan students
            from Form 1 to final year.
          </p>

          <div
            className="hero-rise mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start"
            style={{ animationDelay: "0.25s" }}
          >
            <Link
              href="/signup"
              className="primary-glow-hover transition-smooth group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand-orange px-8 py-4 text-base font-bold text-deep-void hover:bg-brand-orange-dark active:scale-[0.98]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P"
              target="_blank"
              rel="noreferrer"
              className="transition-smooth inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-glass-stroke bg-background/60 px-7 py-4 text-base font-semibold text-on-surface hover:border-brand-orange/50 hover:text-brand-orange active:scale-[0.98]"
            >
              <Bell className="h-4 w-4" />
              Join student updates
            </a>
          </div>
        </div>

        {/* Try it now: the video search is the hero's one visual element. */}
        <motion.div {...(reduceMotion ? {} : scaleIn(0.3))} className="relative">
          {/* Drifting brand bubbles, kept behind the card so they never sit on
              the headline or buttons. CSS-only, paused for reduced motion. */}
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
            <div className="hero-bubble hero-bubble-a -left-6 -top-10 h-44 w-44 bg-brand-orange/45 sm:h-56 sm:w-56 dark:bg-brand-orange/35" />
            <div className="hero-bubble hero-bubble-b -bottom-12 -right-4 h-48 w-48 bg-coral/35 sm:h-64 sm:w-64 dark:bg-coral/30" />
            <div className="hero-bubble hero-bubble-c right-1/4 -top-14 h-32 w-32 bg-amber-300/50 sm:h-40 sm:w-40 dark:bg-amber-400/25" />
          </div>
          <form
            role="search"
            onSubmit={handleSearch}
            className="relative z-10 mx-auto w-full max-w-xl rounded-3xl border border-glass-stroke bg-card/90 p-5 shadow-xl shadow-brand-orange/10 backdrop-blur-md sm:p-7"
          >
            <label htmlFor="hero-video-search" className="block text-lg font-bold normal-case tracking-tight text-on-surface">
              Find a study video
            </label>
            <p className="mt-1 text-sm text-on-surface-variant">
              Free lessons on any topic. No account needed.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-full border border-glass-stroke bg-background/70 p-1.5 pl-4 transition-colors focus-within:border-brand-orange/60">
              <Search className="h-5 w-5 shrink-0 text-outline" aria-hidden="true" />
              <input
                id="hero-video-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try KCSE Chemistry or Calculus"
                className="min-w-0 flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-orange px-5 text-sm font-bold text-deep-void transition-all duration-200 hover:bg-brand-orange-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    setQuery(topic);
                    void runSearch(topic);
                  }}
                  className="rounded-full border border-glass-stroke bg-secondary/60 px-3.5 py-1.5 text-xs font-bold text-on-surface-variant transition-colors duration-200 hover:border-brand-orange/50 hover:text-brand-orange active:scale-95"
                >
                  {topic}
                </button>
              ))}
            </div>
          </form>
        </motion.div>
      </div>

      {/* Search results / instant preview */}
      {(results || error) && (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8">
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
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              Get personalised study content on{" "}
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
