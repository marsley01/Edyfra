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
  const supabase = await createClient();
  
  if (slug.startsWith("rss-")) {
    const news = await getLatestNews();
    const article = news.find(a => a.slug === slug);
    
    if (article && article.content.startsWith("http")) {
      // 1. Check if we already generated and cached this article
      const { data: existing } = await supabase
        .from("news_articles")
        .select("*")
        .eq("title", article.title)
        .single();

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
          published_at: existing.publishedAt || article.published_at,
          reading_time: "2m"
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
        await supabase.from("news_articles").insert({
          title: article.title,
          slug: slugify(article.title) + "-" + Math.floor(Math.random() * 1000),
          category: article.category,
          body: aiContent,
          summary: article.excerpt,
          status: "published",
          coverImage: article.cover_image,
          publishedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("AI News Generation failed:", err);
        // Fallback to a simple link if AI fails
        article.content = `<p>Read the full article here: <a href="${article.content}" target="_blank" class="text-primary underline">${article.title}</a></p>`;
      }
    }
    return article || null;
  }

  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.summary || "",
    content: data.body,
    cover_image: data.coverImage || "https://images.unsplash.com/photo-1546410531-bb4caa1b4247?q=80&w=2070&auto=format&fit=crop",
    category: data.category,
    author: data.authorId ? "Author" : "Edyfra Desk",
    published_at: data.publishedAt || data.createdAt
  };
}
