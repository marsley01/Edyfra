/**
 * lib/thumbnail-resolver.ts
 *
 * Server-side only. Resolves a thumbnail for an RSS article using a
 * three-tier strategy:
 *   1. Supabase DB cache (7-day TTL)
 *   2. OG image scraping
 *   3. Pexels API (with rate-limit guard)
 *
 * Called both from the /api/news-thumbnail route and directly from
 * server actions — no HTTP round-trips between server and itself.
 */

import { createClient as createSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThumbnailResult {
  thumbnail_url: string | null;
  source: "og" | "pexels" | null;
  photographer: string | null;
  photo_page: string | null;
}

interface PexelsPhoto {
  src: { large: string };
  photographer: string;
  url: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BOT_UA = "Mozilla/5.0 (compatible; Edyfra/1.0)";
const STOP_WORDS = new Set([
  "how", "the", "a", "to", "of", "in", "and", "for", "with", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "that", "this", "these", "those", "it", "its", "an",
  "at", "by", "from", "or", "as", "on", "up", "out", "about",
]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

function isPrivateOrLocalIp(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split(".").map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    return false;
  }

  if (h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80:")) return true;

  return false;
}

export function validateExternalArticleUrl(input: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) return null;
  if (hostname.endsWith(".local")) return null;
  if (isPrivateOrLocalIp(hostname)) return null;

  return parsed.toString();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract 2-3 meaningful keywords from an article title. */
function extractKeywords(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 3)
    .join(" ");
}

/** Fetch the OG image from an article URL. Returns null on any failure. */
async function scrapeOgImage(articleUrl: string): Promise<string | null> {
  try {
    const safeUrl = validateExternalArticleUrl(articleUrl);
    if (!safeUrl) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(safeUrl, {
      signal: controller.signal,
      headers: { "User-Agent": BOT_UA },
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();

    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

    const url = match?.[1]?.replace(/&amp;/g, "&").trim() ?? null;
    return url?.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

/** Fetch a landscape photo from Pexels. Returns null if rate-limited or key missing. */
async function fetchPexelsPhoto(
  title: string
): Promise<Pick<ThumbnailResult, "thumbnail_url" | "photographer" | "photo_page"> | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const keywords = extractKeywords(title);
  if (!keywords) return null;

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=3&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    // Guard the rate limit
    const remaining = Number(res.headers.get("X-Ratelimit-Remaining") ?? "999");
    if (remaining < 50) {
      console.warn("[thumbnail] Pexels rate limit low (%d remaining) — skipping", remaining);
      return null;
    }

    if (!res.ok) return null;

    const data: PexelsResponse = await res.json();
    const photo = data.photos?.[0];
    if (!photo) return null;

    return {
      thumbnail_url: photo.src.large,
      photographer: photo.photographer,
      photo_page: photo.url,
    };
  } catch {
    return null;
  }
}

/** Upsert the resolved result into Supabase for caching. */
async function persistToCache(
  articleUrl: string,
  result: ThumbnailResult
): Promise<void> {
  try {
    const supabase = await createSupabaseServer();
    await supabase.from("news_thumbnails").upsert(
      {
        article_url: articleUrl,
        thumbnail_url: result.thumbnail_url,
        thumbnail_source: result.source,
        pexels_photographer: result.photographer,
        pexels_photo_page: result.photo_page,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "article_url" }
    );
  } catch (err) {
    // Non-fatal — log but don't block the response
    console.warn("[thumbnail] Cache write failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Main resolver — exported for use by both the API route and server actions
// ---------------------------------------------------------------------------

export async function resolveThumbnail(
  articleUrl: string,
  articleTitle: string
): Promise<ThumbnailResult> {
  const safeArticleUrl = validateExternalArticleUrl(articleUrl);
  if (!safeArticleUrl) {
    return { thumbnail_url: null, source: null, photographer: null, photo_page: null };
  }

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("news_thumbnails")
      .select("thumbnail_url, thumbnail_source, pexels_photographer, pexels_photo_page, fetched_at")
      .eq("article_url", safeArticleUrl)
      .maybeSingle();

    if (data) {
      const age = Date.now() - new Date(data.fetched_at).getTime();
      if (age < SEVEN_DAYS_MS) {
        // Cache hit — return without any external calls
        return {
          thumbnail_url: data.thumbnail_url ?? null,
          source: (data.thumbnail_source as "og" | "pexels" | null) ?? null,
          photographer: data.pexels_photographer ?? null,
          photo_page: data.pexels_photo_page ?? null,
        };
      }
    }
  } catch (err) {
    console.warn("[thumbnail] Cache read failed:", err);
  }

  // ── 2. OG scraping ──────────────────────────────────────────────────────
  const ogUrl = await scrapeOgImage(safeArticleUrl);
  if (ogUrl) {
    const result: ThumbnailResult = {
      thumbnail_url: ogUrl,
      source: "og",
      photographer: null,
      photo_page: null,
    };
    await persistToCache(safeArticleUrl, result);
    return result;
  }

  // ── 3. Pexels fallback ──────────────────────────────────────────────────
  const pexels = await fetchPexelsPhoto(articleTitle);
  if (pexels) {
    const result: ThumbnailResult = {
      thumbnail_url: pexels.thumbnail_url,
      source: "pexels",
      photographer: pexels.photographer,
      photo_page: pexels.photo_page,
    };
    await persistToCache(articleUrl, result);
    return result;
  }

  // ── 4. Everything failed — cache null so we don't retry every request ───
  const nullResult: ThumbnailResult = {
    thumbnail_url: null,
    source: null,
    photographer: null,
    photo_page: null,
  };
  await persistToCache(articleUrl, nullResult);
  return nullResult;
}
