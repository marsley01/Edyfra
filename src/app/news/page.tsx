"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Calendar, Clock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLatestNews, NewsArticle } from "@/app/actions/news";
import Link from "next/link";

const categories = ["All", "Education", "Tech", "Student Life", "Announcements"];

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getLatestNews(20).then(setNews);
  }, []);

  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filteredNews[0];
  const gridNews = filteredNews.slice(1);

  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-16 md:space-y-24">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
           <div className="max-w-2xl space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Intelligence Feed</p>
              <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
                Ecosystem <br /> <span className="text-muted-foreground">News.</span>
              </h1>
           </div>
           
           <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
              <div className="relative group flex-1 sm:w-80">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                 <Input 
                   placeholder="Search articles..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="h-12 pl-12 rounded-full border-border bg-secondary"
                 />
              </div>
              <div className="flex bg-secondary p-1 rounded-full border border-border">
                 {categories.map(cat => (
                   <button
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={cn(
                       "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                       selectedCategory === cat ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                     )}
                   >
                      {cat}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Featured Hero */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
          >
             <Link href={`/news/${featured.slug}`} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-secondary/50 rounded-[3rem] p-8 md:p-12 border border-border/50 hover:bg-background hover:shadow-2xl hover:translate-y-[-4px] transition-all">
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border border-border shadow-sm">
                   <img src={featured.cover_image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                </div>
                <div className="space-y-8">
                   <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                         Featured
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                         <Clock className="h-3 w-3" /> {featured.reading_time || "5 min read"}
                      </span>
                   </div>
                   <div className="space-y-4">
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest leading-tight">{featured.title}</h2>
                      <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
                         {featured.excerpt}
                      </p>
                   </div>
                   <div className="flex items-center gap-4 pt-4 border-t border-border">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-[10px]">
                         {featured.author[0]}
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-widest">{featured.author}</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(featured.published_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                </div>
             </Link>
          </motion.div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
           {gridNews.map((item, i) => (
             <motion.div
               key={item.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.05 }}
               className="group"
             >
                <Link href={`/news/${item.slug}`} className="space-y-6 block">
                   <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border border-border shadow-sm group-hover:shadow-2xl group-hover:translate-y-[-4px] transition-all duration-500">
                      <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                            {item.category}
                         </span>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(item.published_at).toLocaleDateString()}
                         </span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">
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
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
