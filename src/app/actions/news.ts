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
}

export async function getLatestNews(limit = 3): Promise<NewsArticle[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("Falling back to demo news data:", error?.message);
    return [
      {
        id: "1",
        title: "The Future of Distributed Learning in Kenya",
        slug: "future-of-distributed-learning",
        excerpt: "How Edyfra is revolutionizing academic access through synchronized peer networks.",
        content: "Full content here...",
        cover_image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2670&auto=format&fit=crop",
        category: "Announcements",
        author: "Dr. Mash",
        published_at: new Date().toISOString(),
        reading_time: "5 min read"
      },
      {
        id: "2",
        title: "10 Productivity Protocols for Elite Scholars",
        slug: "productivity-protocols",
        excerpt: "Master your schedule with these institutional-grade study systems.",
        content: "Full content here...",
        cover_image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2670&auto=format&fit=crop",
        category: "Student Life",
        author: "Sarah Omondi",
        published_at: new Date().toISOString(),
        reading_time: "4 min read"
      },
      {
        id: "3",
        title: "Edyfra V2: Total Architecture Overhaul",
        slug: "edyfra-v2-overhaul",
        excerpt: "Deep dive into the technical mission behind our premium design system.",
        content: "Full content here...",
        cover_image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2670&auto=format&fit=crop",
        category: "Tech",
        author: "Engineering Team",
        published_at: new Date().toISOString(),
        reading_time: "8 min read"
      }
    ];
  }

  return data;
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}
