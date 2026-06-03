"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, Calculator, FlaskConical, Code2, 
  GraduationCap, Building2, Coffee, Search, 
  ChevronRight, Users, Loader2, Sparkles, Heart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPublicPosts } from "@/app/actions/forum";

const FORUM_CATEGORIES = [
  {
    id: "mathematics",
    name: "Mathematics",
    description: "Calculus, Algebra, Geometry, and everything numbers.",
    icon: Calculator,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "sciences",
    name: "Sciences",
    description: "Physics, Chemistry, Biology experiments and theory.",
    icon: FlaskConical,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    id: "tech",
    name: "Tech & Coding",
    description: "Programming, Computer Science, and IT discussions.",
    icon: Code2,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    id: "kcse",
    name: "KCSE Prep",
    description: "Past papers, revision strategies, and national exam tips.",
    icon: GraduationCap,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  {
    id: "university",
    name: "University Admissions",
    description: "KUCCPS, course selection, and campus life advice.",
    icon: Building2,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    id: "general",
    name: "General Chat",
    description: "Off-topic discussions, study motivation, and networking.",
    icon: Coffee,
    color: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  },
];

export default function ForumPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadRecentDiscussions() {
      try {
        const data = await getPublicPosts(15);
        setPosts(data);
      } catch (err) {
        console.error("Failed to load forum posts", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecentDiscussions();
  }, []);

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.subject && post.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Forum Header */}
      <div className="border-b border-border bg-secondary/30 pt-32 pb-12 px-6">
        <div className="container-max">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                <MessageSquare className="h-4 w-4" />
                Edyfra Forums
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tightest">
                Join the discussion.
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Ask questions, share your knowledge, and connect with students and tutors across Kenya.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Link href="/dashboard/feed">
                <Button className="h-12 px-8 rounded-full bg-primary text-white hover:bg-primary/90 font-black text-[10px] tracking-widest uppercase shadow-lg transition-all">
                  Start a Discussion
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-12 relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search discussions, subjects, or topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 rounded-2xl bg-background border-border shadow-sm text-base"
            />
          </div>
        </div>
      </div>

      <div className="container-max mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 px-6">
        {/* Main Content - Categories */}
        <div className="lg:col-span-8 space-y-12">
          
          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FORUM_CATEGORIES.map((category) => (
                <Link 
                  key={category.id} 
                  href={`/dashboard/feed?topic=${encodeURIComponent(category.name)}`}
                  className="group block p-5 rounded-3xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors flex items-center justify-between">
                        {category.name}
                        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Discussions list */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Recent Discussions
              </h2>
            </div>

            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest">Loading latest posts...</p>
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredPosts.map((post) => (
                    <Link key={post.id} href={`/dashboard/feed`} className="flex items-start gap-4 p-5 hover:bg-secondary/50 transition-colors group">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={post.user.avatar || undefined} />
                        <AvatarFallback className="text-xs font-bold">{post.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {post.subject || "General"}
                          </span>
                          <span className="text-sm font-bold text-foreground truncate">
                            {post.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {formatDistanceToNow(new Date(post.createdAt))} ago
                          </span>
                        </div>
                        <h4 className="text-base font-medium text-foreground/90 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {post.content}
                        </h4>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-muted-foreground">
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post._count.comments}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center space-y-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">No discussions found</h3>
                    <p className="text-sm text-muted-foreground font-medium">Try adjusting your search or start a new topic.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 space-y-6">
            <h3 className="text-xl font-black tracking-tight">Community Guidelines</h3>
            <ul className="space-y-4 text-sm font-medium text-foreground/80">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-black text-xs">1</span>
                Be respectful and supportive to other learners.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-black text-xs">2</span>
                Keep discussions focused on education and self-improvement.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-black text-xs">3</span>
                Search before you post to avoid duplicate questions.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-black text-xs">4</span>
                No spam or unauthorized promotional content.
              </li>
            </ul>
            <Link href="/dashboard/feed">
              <Button className="w-full rounded-full font-black text-[10px] tracking-widest uppercase">
                Read Full Guidelines
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
