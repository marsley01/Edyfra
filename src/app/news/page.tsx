"use client";

import { useEffect, useState } from "react";
import { Search, Calendar, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLatestNews, NewsArticle } from "@/app/actions/news";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const categories = ["All", "Education", "Tech", "Student Life", "Announcements"];

const categoryColors: Record<string, string> = {
  Tech: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  Education: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  "Student Life": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  Announcements: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
};

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await getLatestNews(30);
      setNews(data);
    } catch (e) {
      console.error("Failed to fetch news:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = searchQuery && (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCategory && (!searchQuery || matchesSearch);
  });

  const featured = filteredNews[0];
  const gridNews = filteredNews.slice(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-20 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container-max relative z-10">
          <div className="max-w-4xl space-y-8">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black uppercase tracking-[0.5em] text-primary"
            >
              Edyfra News Room
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black tracking-tightest leading-none"
            >
              What&apos;s new <br />
              <span className="text-muted-foreground">for students.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl leading-relaxed"
            >
              Read platform updates, education stories, and study notes that can help you make better choices this week.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="container-max py-8 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search news, topics, or advice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 pr-4 rounded-full border-border bg-secondary focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-max py-16 md:py-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[16/10] rounded-3xl bg-secondary animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
                  <div className="h-8 bg-secondary rounded animate-pulse" />
                  <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNews.length > 0 ? (
          <>
            {/* Featured Article */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-16"
              >
                <Link href={`/news/${featured.slug}`} className="group block">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px] rounded-3xl overflow-hidden border border-border shadow-lg group-hover:shadow-2xl transition-all">
                      <Image
                        src={featured.cover_image}
                        alt={featured.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="space-y-6 p-4 lg:p-8">
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${categoryColors[featured.category] || "bg-primary/20 text-primary border-primary/30"}`}>
                          {featured.category}
                        </span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(featured.published_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tightest leading-tight group-hover:text-primary transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-lg text-muted-foreground font-medium leading-relaxed line-clamp-3">
                        {featured.excerpt}
                      </p>
                      <div className="flex items-center gap-2 pt-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs">
                          {featured.author[0]}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest">{featured.author}</p>
                          <p className="text-[9px] text-muted-foreground">Edyfra Desk</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Article Grid */}
            {gridNews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gridNews.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <Link href={`/news/${item.slug}`} className="block space-y-4">
                      <div className="aspect-[16/10] rounded-3xl overflow-hidden border border-border shadow-sm group-hover:shadow-xl group-hover:translate-y-[-2px] transition-all duration-500 relative">
                        <Image
                          src={item.cover_image}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest">
                            {item.reading_time || "3m"} read
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
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${categoryColors[item.category] || "bg-secondary text-primary border-transparent"}`}>
                            {item.category}
                          </span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(item.published_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
                          {item.excerpt}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-[8px]">
                            {item.author[0]}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {item.author}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-32 text-center space-y-8">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <h3 className="text-2xl font-black tracking-tightest">Nothing matched that search</h3>
              <p className="text-muted-foreground font-medium">
                Try another topic, clear the category, or come back when the next update lands.
              </p>
              <Button 
                onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                className="rounded-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
