import { NextResponse } from "next/server";

/**
 * Server-side proxy for YouTube Data API search.
 *
 * Keeps the API key out of the browser bundle and lets us attach a stable
 * Referer (some keys are HTTP-referrer restricted, which breaks direct
 * client-side calls from localhost).
 */

const CACHE_SECONDS = 300; // 5 min — search results don't need to be fresh

/**
 * YouTube Data API returns titles with HTML entities ("&amp;", "&#39;", …).
 * Decode them in one pass so the UI never shows raw "&amp;".
 * Single-pass also keeps literal "&amp;#39;"-style text from double-decoding.
 */
function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi,
    (match: string, code: string) => {
      const key = code.toLowerCase();
      switch (key) {
        case "amp": return "&";
        case "lt": return "<";
        case "gt": return ">";
        case "quot": return '"';
        case "apos": return "'";
        case "nbsp": return " ";
      }
      if (key.startsWith("#x")) {
        const cp = parseInt(key.slice(2), 16);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
      }
      if (key.startsWith("#")) {
        const cp = parseInt(key.slice(1), 10);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
      }
      return match;
    }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured. Add YOUTUBE_API_KEY to the environment." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    part: "snippet",
    q,
    type: "video",
    videoCategoryId: "27",
    videoEmbeddable: "true", // exclude videos whose channels block embedding
    maxResults: "6",
    relevanceLanguage: "en",
    key: apiKey,
  });

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      headers: { Referer: process.env.NEXT_PUBLIC_APP_URL || "https://edyfra-v2.vercel.app/" },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) {
      const status = res.status;
      const body = await res.text().catch(() => "");
      console.error("[youtube/search] upstream error", status, body.slice(0, 300));
      return NextResponse.json(
        {
          error:
            status === 403
              ? "YouTube API quota exceeded or key restricted. Try again later."
              : `YouTube search failed (${status}).`,
        },
        { status: status === 403 ? 429 : 502 }
      );
    }

    const data = await res.json();
    const items = (data.items ?? [])
      .filter((item: { id?: { videoId?: string } }) => Boolean(item.id?.videoId))
      .map(
        (item: {
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails?: { high?: { url: string }; medium?: { url: string } };
          };
        }) => ({
          id: item.id.videoId,
          title: decodeHtmlEntities(item.snippet.title),
          channel: decodeHtmlEntities(item.snippet.channelTitle),
          thumbnail:
            item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? "",
        })
      );

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600` } }
    );
  } catch (err) {
    console.error("[youtube/search] request failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
