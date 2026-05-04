"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, User } from "lucide-react";
import { getLatestNews, NewsArticle } from "@/app/actions/news";
import { Button } from "@/components/ui/button";

export function HomeNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    getLatestNews().then(setNews);
  }, []);

  return (
    <section className="py-32 md:py-48 bg-background">
      <div className="container-max space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Latest from Edyfra.</h2>
              <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
                Synchronize with the latest developments in the Kenyan academic ecosystem.
              </p>
           </div>
           <Link href="/news">
              <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase text-primary hover:text-primary group">
                View all protocols <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
           </Link>
        </div>

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
              <Link href={`/news/${item.slug}`} className="space-y-6 block">
                 <div className="aspect-[16/10] rounded-3xl overflow-hidden border border-border shadow-sm group-hover:shadow-2xl group-hover:translate-y-[-4px] transition-all duration-500">
                    <img 
                      src={item.cover_image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
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
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
