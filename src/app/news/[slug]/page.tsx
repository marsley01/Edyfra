"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, ArrowLeft, Share2, Link as LinkIcon, Send, BookOpen, Sparkles } from "lucide-react";
import { getNewsBySlug, NewsArticle, getLatestNews } from "@/app/actions/news";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion, useScroll, useSpring } from "framer-motion";

const categoryColors: Record<string, string> = {
  Tech: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  Education: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  "Student Life": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  Announcements: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
};

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      loadArticle(slug as string);
      getLatestNews(4).then(setRelated);
    }
  }, [slug]);

  const loadArticle = async (articleSlug: string) => {
    setLoading(true);
    setError(false);
    try {
      const data = await getNewsBySlug(articleSlug);
      if (data?.slug.startsWith("rss-")) {
        window.location.href = data.content;
        return;
      }
      setArticle(data);
    } catch (e) {
      console.error("Failed to load article:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-6 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 bg-background">
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h1 className="text-4xl font-black tracking-tightest">Article not found.</h1>
          <p className="text-muted-foreground max-w-md">
            The intelligence you&apos;re looking for may have been archived or moved.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/news">
            <Button className="h-12 px-8 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase">
              Back to Feed
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="h-12 px-8 rounded-full font-black text-xs tracking-widest uppercase">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <article className="min-h-screen bg-background">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
        style={{ scaleX }}
      />
      {/* Hero Section with Cover */}
      <div className="relative h-[60vh] w-full border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background z-10" />
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-20" />
        
        {/* Back Navigation */}
        <div className="absolute top-8 left-8 right-8 z-30">
          <Link href="/news" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </Link>
        </div>

        {/* Article Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-8 md:p-16 pb-12">
          <div className="container-max">
            <div className="max-w-4xl space-y-6">
              <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm border ${categoryColors[article.category] || "bg-primary/20 text-primary border-primary/30"}`}>
                {article.category}
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-tight text-white drop-shadow-lg">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-white/80 text-xs font-black uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm">
                    {article.author[0]}
                  </div>
                  <span>{article.author}</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {article.reading_time || "5 min read"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-max py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar Actions */}
          <div className="lg:col-span-1 flex lg:flex-col gap-4 sticky top-32 h-fit">
            <Button size="icon" variant="outline" className="rounded-full border-border hover:bg-primary hover:text-white transition-all shadow-sm" title="Share">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="rounded-full border-border hover:bg-primary hover:text-white transition-all shadow-sm" title="Copy Link">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Article Body */}
          <div className="lg:col-span-8">
            <div className="prose prose-lg md:prose-xl max-w-none font-medium leading-relaxed text-foreground">
              <p className="text-2xl md:text-3xl font-semibold text-muted-foreground mb-16 leading-snug border-l-4 border-primary pl-8">
                {article.excerpt}
              </p>
              
              <div className="space-y-8">
                {article.content && article.content.includes("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                ) : (
                  <>
                    <p className="text-xl leading-relaxed text-foreground/90">
                      The academic landscape in Kenya is undergoing a fundamental transformation. At Edyfra, we are not just observing this change; we are architecting the infrastructure that makes it possible. Distributed intelligence is more than just a buzzword—it is the synchronization of thousands of individual academic trajectories into a single, high-performance ecosystem.
                    </p>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tightest text-foreground">The Protocol of Discovery</h3>
                    <p className="text-lg leading-relaxed text-foreground/90">
                      Standard learning systems focus on storage. Edyfra focuses on connection. By leveraging our proprietary AI discovery engine, we ensure that every scholar is matched with the exact resources and mentors needed for their current mission. This removes the legacy friction that has plagued Kenyan education for decades.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-8 py-4 italic text-2xl font-black tracking-tightest text-foreground bg-primary/5 rounded-r-2xl">
                      &quot;The future of education isn&apos;t about more content; it&apos;s about more synchronization.&quot;
                    </blockquote>
                    <p className="text-lg leading-relaxed text-foreground/90">
                      As we move into the next phase of our mission, we are doubling down on our institutional verification protocols. Every expert on our platform is hand-audited to ensure they meet the institutional grade standards our community demands.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Tag Cloud */}
            <div className="flex flex-wrap gap-3 pt-16 mt-16 border-t border-border">
              {["Academic OS", "Future of Education", "Kenya Tech", "Distributed Learning"].map(tag => (
                <span key={tag} className="px-4 py-2 rounded-full bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
                  #{tag.replace(/\s+/g, "")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <div className="py-24 bg-secondary/30">
          <div className="container-max space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black tracking-tightest">Related Intelligence.</h2>
              <Link href="/news" className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2">
                View all <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.filter(r => r.id !== article.id).slice(0, 3).map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <Link href={`/news/${r.slug}`} className="group block space-y-4">
                    <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-border shadow-sm group-hover:shadow-2xl group-hover:translate-y-[-4px] transition-all duration-500">
                      <Image
                        src={r.cover_image}
                        alt={r.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${categoryColors[r.category] || "bg-secondary text-primary border-transparent"}`}>
                        {r.category}
                      </span>
                      <h3 className="text-lg font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {r.title}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(r.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
