/**
 * GET /api/news-thumbnail?url=<article_url>&title=<article_title>
 *
 * Server-side thumbnail resolver for RSS news articles.
 * All external requests (OG scraping, Pexels) happen here — never on the client.
 * Uses a Supabase-backed 7-day cache to avoid repeated external calls.
 */

import { type NextRequest, NextResponse } from "next/server";
import { resolveThumbnail } from "@/lib/thumbnail-resolver";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const articleUrl = searchParams.get("url");
  const articleTitle = searchParams.get("title") ?? "";

  if (!articleUrl || !articleUrl.startsWith("http")) {
    return NextResponse.json(
      { error: "Missing or invalid `url` query parameter" },
      { status: 400 }
    );
  }

  try {
    const result = await resolveThumbnail(articleUrl, articleTitle);
    return NextResponse.json(result, {
      status: 200,
      headers: {
        // Let the CDN / Next.js cache the response for 1 hour too
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[/api/news-thumbnail] Unhandled error:", err);
    return NextResponse.json({ thumbnail_url: null, source: null, photographer: null, photo_page: null }, { status: 200 });
  }
}
