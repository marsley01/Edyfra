import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { JsonLd } from "@/components/json-ld";
import NewsArticleClient from "./NewsArticleClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://edyfra-v2.vercel.app";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const article = await prisma.newsArticle.findUnique({ where: { slug } });

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
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
      publishedTime: article.publishedAt?.toISOString() || undefined,
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
  const article = await prisma.newsArticle.findUnique({ where: { slug } });

  if (!article) return null;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary || undefined,
    image: article.coverImage || undefined,
    datePublished: article.publishedAt?.toISOString() || undefined,
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
