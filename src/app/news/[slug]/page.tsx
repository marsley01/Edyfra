"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowLeft, Share2, Link as LinkIcon, Send } from "lucide-react";
import { getNewsBySlug, NewsArticle, getLatestNews } from "@/app/actions/news";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      getNewsBySlug(slug as string).then(data => {
        setArticle(data);
        setLoading(false);
      });
      getLatestNews(3).then(setRelated);
    }
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
       <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6">
       <h1 className="text-4xl font-black">Article not found.</h1>
       <Link href="/news">
          <Button>Back to Intelligence Feed</Button>
       </Link>
    </div>
  );

  return (
    <article className="bg-background pt-32 pb-48">
      <div className="container-max">
        {/* Navigation */}
        <Link href="/news" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-12">
           <ArrowLeft className="h-4 w-4" /> Back to Intelligence Feed
        </Link>

        {/* Hero */}
        <div className="space-y-12">
           <div className="space-y-6 max-w-4xl">
              <span className="px-3 py-1 rounded-full bg-secondary text-primary text-[10px] font-black uppercase tracking-widest">
                 {article.category}
              </span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-tight">
                 {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-8 pt-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-black uppercase text-xs">
                       {article.author[0]}
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-widest">{article.author}</p>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mission Lead</p>
                    </div>
                 </div>
                 <div className="h-8 w-px bg-border hidden md:block" />
                 <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(article.published_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {article.reading_time || "5 min read"}</span>
                 </div>
              </div>
           </div>

           <div className="aspect-[21/9] rounded-[3rem] overflow-hidden border border-border shadow-2xl">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
           </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mt-24">
           {/* Sidebar Actions */}
           <div className="lg:col-span-1 flex lg:flex-col gap-6 sticky top-32 h-fit">
              <Button size="icon" variant="outline" className="rounded-full border-border hover:bg-primary hover:text-white transition-all shadow-sm">
                 <Share2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-border hover:bg-primary hover:text-white transition-all shadow-sm">
                 <LinkIcon className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-border hover:bg-primary hover:text-white transition-all shadow-sm">
                 <Send className="h-4 w-4" />
              </Button>
           </div>

           {/* Article Body */}
           <div className="lg:col-span-8 space-y-12">
              <div className="prose prose-xl prose-neutral dark:prose-invert max-w-none font-medium leading-relaxed text-muted-foreground selection:bg-primary/20">
                 <p className="text-2xl font-semibold text-foreground mb-8 leading-snug">
                    {article.excerpt}
                 </p>
                 <div dangerouslySetInnerHTML={{ __html: article.content }} />
                 {/* Fallback content for demo */}
                 {!article.content.includes("<") && (
                   <div className="space-y-8">
                     <p>
                        The academic landscape in Kenya is undergoing a fundamental transformation. At Edyfra, we are not just observing this change; we are architecting the infrastructure that makes it possible. Distributed intelligence is more than just a buzzword—it is the synchronization of thousands of individual academic trajectories into a single, high-performance ecosystem.
                     </p>
                     <h3 className="text-foreground">The Protocol of Discovery</h3>
                     <p>
                        Standard learning systems focus on storage. Edyfra focuses on connection. By leveraging our proprietary AI discovery engine, we ensure that every scholar is matched with the exact resources and mentors needed for their current mission. This removes the legacy friction that has plagued Kenyan education for decades.
                     </p>
                     <blockquote className="border-l-4 border-primary pl-8 py-4 italic text-foreground text-2xl font-bold tracking-tight">
                        "The future of education isn't about more content; it's about more synchronization."
                     </blockquote>
                     <p>
                        As we move into the next phase of our mission, we are doubling down on our institutional verification protocols. Every expert on our platform is hand-audited to ensure they meet the institutional grade standards our community demands.
                     </p>
                   </div>
                 )}
              </div>

              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-3 pt-12 border-t border-border">
                 {["Academic OS", "Future of Education", "Kenya Tech", "Distributed Learning"].map(tag => (
                   <span key={tag} className="px-4 py-2 rounded-full bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      #{tag.replace(/\s+/g, "")}
                   </span>
                 ))}
              </div>
           </div>
        </div>

        {/* Related Articles */}
        <div className="mt-48 space-y-16">
           <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black tracking-tightest">Related intelligence.</h2>
              <Link href="/news" className="text-xs font-black uppercase tracking-widest text-primary hover:underline">View all</Link>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.filter(r => r.id !== article.id).slice(0, 3).map((r) => (
                <Link key={r.id} href={`/news/${r.slug}`} className="group space-y-4 block">
                   <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-border group-hover:shadow-xl transition-all">
                      <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                   </div>
                   <h4 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors">{r.title}</h4>
                </Link>
              ))}
           </div>
        </div>
      </div>
    </article>
  );
}
