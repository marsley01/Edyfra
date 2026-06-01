"use server";

import { createClient } from "@/utils/supabase/server";

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
}

import { RSSService, RSSItem } from "@/utils/rss-service";

export async function getLatestNews(limit = 10): Promise<NewsArticle[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  // If we have local database news, return it
  if (data && data.length > 0) {
    return data;
  }

  // Fallback: Fetch from RSS feeds if DB is empty (Zero-Maintenance Mode)
  try {
    const rss = new RSSService();
    const feedResults = await rss.fetchAllFeeds();
    const items = feedResults.flatMap(r => r.items);
    
    const newsArticles = items.slice(0, limit).map((item, index) => {
      // Safe Fallback: clean string manually for extremely fast processing
      const excerpt = item.description.replace(/<[^>]*>?/gm, '').replace(/&lt;.*?&gt;/g, '').slice(0, 180) + "...";

      return {
        id: `rss-${index}`,
        title: item.title,
        slug: `rss-${index}`,
        excerpt: excerpt,
        content: item.link, // Store original link in content
        cover_image: item.imageUrl || "https://images.unsplash.com/photo-1546410531-bb4caa1b4247?q=80&w=2070&auto=format&fit=crop",
        category: item.category || "Global Updates",
        author: item.source,
        published_at: item.pubDate,
        reading_time: "3m"
      };
    });

    return newsArticles;
  } catch (err) {
    console.error("News Fallback Error:", err);
    return [];
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const supabase = await createClient();
  
  if (slug.startsWith("rss-")) {
    const news = await getLatestNews();
    return news.find(a => a.slug === slug) || null;
  }

  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}
