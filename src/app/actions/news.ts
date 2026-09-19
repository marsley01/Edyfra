"use server";

import { RSSService, RSSItem } from "@/utils/rss-service";
import { getCached, TTL } from "@/lib/cache";
import prisma from "@/lib/prisma";

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  author: string;
  published_at: string;
  reading_time?: string;
  isDraft?: boolean;
  /** Resolved thumbnail — may differ from cover_image for DB articles */
  thumbnail_url: string | null;
  thumbnail_source: "og" | "pexels" | null;
  pexels_photographer: string | null;
  pexels_photo_page: string | null;
}

import { fetchOgImage } from "@/utils/og-scraper";

const HTML_ANGLE_BRACKET_REGEX = /[<>]/g;
const HTML_ENTITY_BRACKET_REGEX = /&lt;|&gt;/gi;

/** Removes literal and entity-encoded HTML angle brackets from RSS excerpts. */
function stripRssExcerpt(input: string): string {
  return input
    .replace(HTML_ENTITY_BRACKET_REGEX, "")
    .replace(HTML_ANGLE_BRACKET_REGEX, "");
}

// Single branded fallback thumbnail — used whenever an article has no real cover image.
// This keeps the news cards visually consistent instead of scattering random Unsplash photos.
const GENERIC_FALLBACK = "/og-image.png";

// Sources and title keywords that indicate Kenyan content
const KE_SOURCES = new Set([
  "nation africa",
  "kenya education news",
  "kenyan schools",
  "knec exams",
  "kuccps universities",
]);

const KE_KEYWORDS = [
  "kenya", "kenyan", "nairobi", "kcse", "kcpe", "knec", "kuccps",
  "ministry of education", "tsc", "cbc", "competency based",
  "nairobi", "mombasa", "kisumu", "eldoret", "nakuru",
];

function getFallbackImage(_category?: string, _title?: string, _source?: string): string {
  return GENERIC_FALLBACK;
}

function isKenyanArticle(source: string, title: string): boolean {
  if (KE_SOURCES.has(source.toLowerCase())) return true;
  const lower = title.toLowerCase();
  return KE_KEYWORDS.some(kw => lower.includes(kw));
}

function kenyanBoost(item: { source: string; title: string }): number {
  return isKenyanArticle(item.source, item.title) ? 1 : 0;
}

export async function getLatestNews(limit = 10): Promise<NewsArticle[]> {
  return getCached(`news:latest:${limit}`, TTL.KNOWLEDGE_FEED, async () => {
  // Fetch extra articles to allow room for Kenyan prioritization
  const fetchLimit = Math.max(limit, 50);

  let articles: Awaited<ReturnType<typeof prisma.newsArticle.findMany>> = [];
  try {
    articles = await prisma.newsArticle.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: fetchLimit,
    });
  } catch (error) {
    console.error("News DB query failed:", error);
  }

  // If we have local database news, apply fallback images and return it
  if (articles.length > 0) {
    return articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.summary || "",
      content: a.body || "",
      cover_image: a.coverImage || getFallbackImage(a.category, a.title, a.authorId ? "Author" : "Edyfra Desk"),
      category: a.category,
      author: a.authorId ? "Author" : "Edyfra Desk",
      published_at: (a.publishedAt ?? a.createdAt).toISOString(),
      reading_time: undefined,
      // DB articles use cover_image directly; no separate thumbnail resolver needed
      thumbnail_url: a.coverImage ?? null,
      thumbnail_source: null as null,
      pexels_photographer: null,
      pexels_photo_page: null,
    })).slice(0, limit);
  }

  // Fallback: Fetch from RSS feeds if DB is empty (Zero-Maintenance Mode)
  try {
    const rss = new RSSService();
    const feedResults = await rss.fetchAllFeeds();
    const allItems = feedResults.flatMap(r => r.items);

    // Kenyan boost: sort so that Kenyan articles appear first, then by date
    const sorted = [...allItems].sort((a, b) => {
      const aBoost = kenyanBoost(a);
      const bBoost = kenyanBoost(b);
      if (aBoost !== bBoost) return bBoost - aBoost;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    const newsArticles = await Promise.all(
      sorted.slice(0, limit).map(async (item, index) => {
        const excerpt = stripRssExcerpt(item.description).slice(0, 180) + "...";


        return {
          id: `rss-${index}`,
          title: item.title,
          slug: `rss-${index}`,
          excerpt: excerpt,
          content: item.link,
          cover_image: item.thumbnail_url || getFallbackImage(item.category, item.title, item.source),
          category: item.category || "Global Updates",
          author: item.source,
          published_at: item.pubDate,
          reading_time: "3m",
          thumbnail_url: item.thumbnail_url,
          thumbnail_source: item.thumbnail_source,
          pexels_photographer: item.pexels_photographer,
          pexels_photo_page: item.pexels_photo_page,
        };
      })
    );

    return newsArticles;
  } catch (err) {
    console.error("News Fallback Error:", err);
    return [];
  }
  });
}

import { AIService } from "@/utils/ai-service";

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  if (slug.startsWith("rss-")) {
    const news = await getLatestNews();
    const article = news.find(a => a.slug === slug);
    
    if (article && article.content.startsWith("http")) {
      // 1. Check if we already generated and cached this article
      const existing = await prisma.newsArticle.findFirst({
        where: { title: article.title },
      });

      if (existing) {
        return {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          excerpt: existing.summary || article.excerpt,
          content: existing.body,
          cover_image: existing.coverImage || article.cover_image,
          category: existing.category,
          author: "Edyfra AI",
          published_at: (existing.publishedAt ?? existing.createdAt).toISOString(),
          reading_time: "2m",
          thumbnail_url: existing.coverImage || article.thumbnail_url,
          thumbnail_source: article.thumbnail_source,
          pexels_photographer: article.pexels_photographer,
          pexels_photo_page: article.pexels_photo_page,
        };
      }

      // 2. Not cached. Generate personalized article using AI to save tokens in future
      const prompt = `Write a short, engaging news article for high school and university students about this topic: "${article.title}". 
Context/Summary: ${article.excerpt}. 
Original Link: ${article.content}.
Keep it under 3 paragraphs (max 200 words). Focus on why it matters to students, tech, or education. Use clean HTML formatting (e.g., <p>, <strong>, <ul>) instead of markdown so it renders perfectly.`;
      
      const systemPrompt = "You are an expert news editor for Edyfra, an educational platform for students. Write concise, highly engaging, student-focused news articles in valid HTML.";
      
      try {
        const aiContent = await AIService.generateCompletion(prompt, systemPrompt);
        article.content = aiContent;
        article.author = "Edyfra AI";

        // 3. Cache it in the database to save tokens on future views
        await prisma.newsArticle.create({
          data: {
            title: article.title,
            slug: slugify(article.title) + "-" + Math.floor(Math.random() * 1000),
            category: article.category,
            body: aiContent,
            summary: article.excerpt,
            status: "published",
            isDraft: false,
            coverImage: article.cover_image,
            publishedAt: new Date(),
          },
        });
      } catch (err) {
        console.error("AI News Generation failed:", err);
        // Fallback to a simple link if AI fails
        article.content = `<p>Read the full article here: <a href="${article.content}" target="_blank" class="text-primary underline">${article.title}</a></p>`;
      }
    }
    return article || null;
  }

  const data = await prisma.newsArticle.findUnique({ where: { slug } });

  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.summary || "",
    content: data.body,
    cover_image: data.coverImage || getFallbackImage(data.category, data.title, data.authorId ? "Author" : "Edyfra Desk"),
    category: data.category,
    author: data.authorId ? "Author" : "Edyfra Desk",
    published_at: (data.publishedAt ?? data.createdAt).toISOString(),
    thumbnail_url: data.coverImage ?? null,
    thumbnail_source: null,
    pexels_photographer: null,
    pexels_photo_page: null,
  };
}
