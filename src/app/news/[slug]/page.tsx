"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { getNewsBySlug, NewsArticle } from "@/app/actions/news";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewsArticlePage({ params }: { params: { slug: string } }) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      try {
        const data = await getNewsBySlug(params.slug);
        if (!data) {
          notFound();
        }
        setArticle(data);
      } catch (e) {
        console.error("Failed to fetch article:", e);
        notFound();
      } finally {
        setIsLoading(false);
      }
    }

    loadArticle();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container-max">
          <div className="space-y-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h2 className="text-3xl font-black tracking-tightest">Loading article...</h2>
            <p className="text-muted-foreground">Please wait while we fetch the article for you.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Article Header */}
      <div className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-10 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container-max relative z-10">
          <div className="space-y-6">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black uppercase tracking-[0.5em] text-primary"
            >
              {article.category}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black tracking-tightest leading-none"
            >
              {article.title}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 text-muted-foreground font-medium"
            >
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Calendar className="h-4 w-4 mr-2" /> {new Date(article.published_at).toLocaleDateString()}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> {article.author}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {article.reading_time || "3m"} read
              </motion.span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="container-max py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg prose-headings:font-bold prose-headings:scroll-mt-20 prose-leading-relaxed"
        >
          {/* We'll use dangerouslySetInnerHTML for the content since it's rich text */}
          <div 
            dangerouslySetInnerHTML={{ __html: article.content }} 
            className="w-full"
          />
        </motion.div>
      </div>

      {/* Call to Action */}
      <div className="container-max py-16 border-t border-border">
        <div className="space-y-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground font-medium max-w-2xl mx-auto"
          >
            Found this helpful? Share it with a study buddy or save it for later.
          </motion.p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              variant="outline"
              className="h-12 px-8"
            >
              Share Article
            </Button>
            <Button 
              className="h-12 px-8"
            >
              Save for Later
            </Button>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      <div className="container-max py-16">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-4"
        >
          More from Edyfra
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black tracking-tightest mb-8"
        >
          You might also like
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Placeholder for related articles - in a real app, we'd fetch these based on category/tags */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              <Link href={`/news/article-${i}`} className="block space-y-4">
                <div className="aspect-[16/10] rounded-3xl overflow-hidden border border-border shadow-sm group-hover:shadow-xl group-hover:translate-y-[-2px] transition-all duration-500 relative">
                  <Image
                    src="/placeholder-news.jpg"
                    alt="Related Article"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest">
                      3m read
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-3 py-1 rounded-full bg-primary text-white text-[8px] font-black uppercase tracking-widest">
                      Read More
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-secondary text-primary border-transparent">
                      Education
                    </span>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Jan 15, 2026
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    How to Master Kenyan History in 30 Days
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
                    Proven study techniques and resources for excelling in KCSE history papers.
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}