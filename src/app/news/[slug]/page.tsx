import type { Metadata } from "next";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { JsonLd } from "@/components/json-ld";
import { getAppUrl } from "@/lib/app-url";
import NewsArticleClient from "./NewsArticleClient";

const siteUrl = getAppUrl();

type Props = {
  params: Promise<{ slug: string }>;
};

// Articles live in the Prisma `NewsArticle` table (same source the client
// reads via getNewsBySlug). The legacy Supabase `news_articles` table is not
// what the app writes to, so querying it made every article look missing.
// RSS-backed slugs (`rss-N`) have no DB row until first view.
const getArticle = cache(async (slug: string) => {
  try {
    return await prisma.newsArticle.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
        createdAt: true,
        category: true,
      },
    });
  } catch (err) {
    console.error("[news/slug] article lookup failed:", err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const article = await getArticle(slug);

  if (!article) {
    if (slug.startsWith("rss-")) return { title: "News" };
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
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
      publishedTime: (article.publishedAt ?? article.createdAt).toISOString(),
      tags: [article.category],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary || undefined,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

async function getArticleJsonLd(slug: string) {
  const article = await getArticle(slug);

  if (!article) return null;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary || undefined,
    image: article.coverImage || undefined,
    datePublished: (article.publishedAt ?? article.createdAt).toISOString(),
    author: {
      "@type": "Person",
      name: "Edyfra",
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
