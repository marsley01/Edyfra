"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Calendar } from "lucide-react";
import { getLatestNews, NewsArticle } from "@/app/actions/news";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

export function HomeNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      const data = await getLatestNews();
      setNews(data);
      setIsLoading(false);
    }
    loadNews();
  }, []);

  return (
    <section className="py-32 md:py-48 bg-background">
      <div className="container-max space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Latest from Edyfra.</h2>
              <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
                News, platform notes, and study updates worth checking before your next session.
              </p>
           </div>
           <Link href="/news">
              <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase text-primary hover:text-primary group">
                Open News Room <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
           </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[16/10] rounded-3xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {news.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <a 
                  href={item.slug.startsWith("rss") ? item.content : `/news/${item.slug}`} 
                  target={item.slug.startsWith("rss") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="space-y-6 block"
                >
                   <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-border shadow-sm group-hover:shadow-2xl group-hover:translate-y-[-4px] transition-all duration-500">
                      <Image 
                        src={item.cover_image} 
                        alt={item.title} 
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-1000"
                      />
                  </div>
                  <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-secondary text-[10px] font-black uppercase tracking-widest text-primary">
                            {item.category}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(item.published_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm font-medium leading-relaxed line-clamp-2">
                        {item.excerpt}
                      </p>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={BookOpen}
            title="News Room Warming Up"
            description="We are preparing fresh education updates. Check back soon, or refresh if you just added articles."
            actionText="Refresh Feed"
            onAction={() => window.location.reload()}
          />
        )}
      </div>
    </section>
  );
}
