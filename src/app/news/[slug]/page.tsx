import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { JsonLd } from "@/components/json-ld";
import NewsArticleClient from "./NewsArticleClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://edyfra-v2.vercel.app";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: article } = await supabase
    .from("news_articles")
    .select("title, summary, slug, cover_image, published_at, category")
    .eq("slug", slug)
    .single();

  if (!article) {
    return { title: "Article Not Found", robots: { index: false } };
  }

  return {
    title: article.title,
    description: article.summary || `Read ${article.title} on Edyfra — Kenya's study platform.`,
    openGraph: {
      title: article.title,
      description: article.summary || undefined,
      type: "article",
      url: `${siteUrl}/news/${article.slug}`,
      images: article.cover_image ? [{ url: article.cover_image }] : undefined,
      publishedTime: article.published_at,
      tags: [article.category],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary || undefined,
      images: article.cover_image ? [article.cover_image] : undefined,
    },
  };
}

async function getArticleJsonLd(slug: string) {
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("news_articles")
    .select("title, summary, slug, cover_image, published_at, category, author, body")
    .eq("slug", slug)
    .single();

  if (!article) return null;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary || undefined,
    image: article.cover_image || undefined,
    datePublished: article.published_at,
    author: {
      "@type": "Person",
      name: article.author || "Edyfra",
    },
    publisher: {
      "@type": "Organization",
      name: "Edyfra",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/news/${article.slug}`,
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const articleJsonLd = await getArticleJsonLd(slug);

  return (
    <>
      {articleJsonLd && <JsonLd data={articleJsonLd} />}
      <NewsArticleClient params={params} />
    </>
  );
}
