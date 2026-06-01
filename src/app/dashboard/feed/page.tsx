"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { 
  Heart, MessageCircle, Share2, 
  Send, Search,
  MoreHorizontal, Loader2, TrendingUp,
  UserPlus, Hash, Users, Flame, Sparkles, Zap, Newspaper,
  ImageIcon
} from "lucide-react";
import { getPosts, createPost, likePost } from "@/app/actions/feed";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface FeedUser {
  name: string;
  avatar?: string | null;
  educationLevel?: string;
}

interface Post {
  id: string;
  content: string;
  image?: string | null;
  createdAt: Date | string;
  subject?: string | null;
  likes: number;
  user: FeedUser;
  likedBy: { userId: string }[];
  comments: any[];
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    init();
    loadPosts();
    fetchTechNews();
  }, [filter]);

  const fetchTechNews = async () => {
    try {
      const { getLatestNews } = await import("@/app/actions/news");
      const data = await getLatestNews(4);
      setNews(data);
    } catch (e) {
      console.error("Failed to fetch news", e);
    }
  };

   const loadPosts = async () => {
      setLoading(true);
      try {
        const data = await getPosts(filter);
       // Map Prisma types to client-side Post interface
       const mappedData = data.map(post => ({
         id: post.id,
         content: post.content,
         image: post.image,
         createdAt: post.createdAt,
         subject: post.subject,
         likes: post.likes,
         user: {
           name: post.user.name,
           avatar: post.user.avatar,
           educationLevel: post.user.educationLevel || undefined
         },
         likedBy: post.likedBy,
         comments: post.comments
       }));
       setPosts(mappedData);
     } catch (error: any) {
       console.error("Failed to load feed:", error);
       toast.error(error?.message || "Failed to load feed. Please try again.");
     } finally {
       setLoading(false);
     }
   };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost(newPostContent);
      setNewPostContent("");
      toast.success("Shared with the community!");
      loadPosts();
    } catch (error) {
      toast.error("Failed to share post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    
    // Optimistic Update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.likedBy.some(l => l.userId === currentUserId);
        return {
          ...post,
          likes: isLiked ? post.likes - 1 : post.likes + 1,
          likedBy: isLiked 
            ? post.likedBy.filter(l => l.userId !== currentUserId)
            : [...post.likedBy, { userId: currentUserId }]
        };
      }
      return post;
    }));

    try {
      await likePost(postId);
    } catch {
      toast.error("Failed to like post");
      loadPosts(); // Revert on failure
    }
  };

   return (
     <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 font-sans animate-in fade-in duration-700">
       {/* Left Sidebar - Profile Summary */}
       <div className="hidden lg:block lg:col-span-3 space-y-4 lg:space-y-6">
         <Card className="border-border rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm sticky top-20">
            <div className="h-16 lg:h-20 bg-primary/10" />
            <CardContent className="p-4 lg:p-6 -mt-10 text-center space-y-3">
               <Avatar className="h-16 w-16 lg:h-20 lg:w-20 mx-auto border-4 border-background shadow-xl">
                  <AvatarFallback><Users className="h-6 w-6 lg:h-8 lg:w-8" /></AvatarFallback>
               </Avatar>
               <div className="space-y-1">
                  <h3 className="text-lg lg:text-xl font-black tracking-tight">Your Profile</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Community Hub</p>
               </div>
            </CardContent>
         </Card>
       </div>

       {/* Main Feed */}
       <main className="lg:col-span-6 space-y-4 lg:space-y-8">
         {/* Header & Filters */}
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h1 className="text-2xl lg:text-3xl font-black tracking-tighter">Community <span className="text-primary">Feed</span></h1>
               <div className="flex bg-secondary p-1 rounded-xl gap-1">
                  {["all", "following", "school"].map((f) => (
                     <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                     >
                        {f}
                     </button>
                  ))}
               </div>
            </div>

            {/* Post Composer */}
            <Card className="border-border rounded-2xl lg:rounded-3xl shadow-sm bg-card hover:shadow-md transition-shadow">
               <CardContent className="p-4 lg:p-6 space-y-3">
                  <div className="flex gap-3">
                     <Avatar className="h-10 w-10 lg:h-12 lg:w-12 border border-border">
                        <AvatarFallback><Send className="h-4 w-4 lg:h-5 lg:w-5" /></AvatarFallback>
                     </Avatar>
                     <textarea 
                       value={newPostContent}
                       onChange={(e) => setNewPostContent(e.target.value)}
                       placeholder="What's on your mind? Share a discovery or ask a question..."
                       className="flex-1 bg-transparent border-none focus:ring-0 text-base lg:text-lg font-medium resize-none min-h-[60px] lg:min-h-[80px] pt-2 placeholder:text-muted-foreground/40"
                     />
                  </div>
                   <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" className="rounded-full gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Photo</span>
                      </Button>
                   </div>
                  <Button 
                    onClick={handleCreatePost}
                    disabled={isSubmitting || !newPostContent.trim()}
                    className="rounded-full bg-primary hover:bg-primary/90 font-black text-[10px] tracking-widest uppercase px-8 h-10 shadow-lg shadow-primary/20"
                  >
                     {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                     Post
                  </Button>
              </CardContent>
           </Card>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6 pb-20">
           {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                 <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading your feed...</p>
              </div>
           ) : posts.length > 0 ? (
              posts.map((post: Post) => (
                 <Card key={post.id} className="border-border rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card">
                    <CardContent className="p-4 lg:p-6 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Avatar className="h-9 w-9 lg:h-10 lg:w-10 border border-border group-hover:scale-105 transition-transform">
                                <AvatarImage src={post.user.avatar || undefined} />
                                <AvatarFallback className="text-[10px] lg:text-xs">{post.user.name[0]}</AvatarFallback>
                             </Avatar>
                             <div>
                                <div className="flex items-center gap-2">
                                   <h4 className="font-black text-sm lg:text-base tracking-tight">{post.user.name}</h4>
                                   <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                   <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                                 </div>
                                <p className="text-[9px] lg:text-[10px] font-black text-primary uppercase tracking-[0.05em]">{post.user.educationLevel?.replace('_', ' ') || 'Student'} • {post.subject || 'General'}</p>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                           </Button>
                        </div>

                       <div className="text-sm lg:text-base font-medium leading-relaxed text-foreground/90 pl-[44px] lg:pl-[52px]">
                          {post.content}
                       </div>

                       {post.image && (
                         <div className="pl-[44px] lg:pl-[52px]">
                            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                                <Image 
                                  src={post.image} 
                                  alt="Post visual" 
                                  width={800}
                                  height={500}
                                  className="w-full h-auto object-cover max-h-[400px] lg:max-h-[500px]"
                                />
                            </div>
                         </div>
                       )}

                       <div className="flex items-center gap-4 lg:gap-8 pt-3 border-t border-border/50 pl-[44px] lg:pl-[52px]">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors group/btn"
                          >
                             <Heart className={`h-4 w-4 group-hover/btn:scale-110 transition-transform ${post.likedBy?.some((l: { userId: string }) => l.userId === currentUserId) ? 'fill-red-500 text-red-500' : ''}`} />
                             {post.likes}
                          </button>
                          <button className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-muted-foreground hover:text-primary transition-colors group/btn">
                             <MessageCircle className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                             {post.comments?.length || 0}
                          </button>
                          <button className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-muted-foreground hover:text-primary transition-colors group/btn ml-auto">
                             <Share2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                       </div>

                      <div className="flex items-center gap-8 pt-4 border-t border-border/50 pl-[52px]">
                         <button 
                           onClick={() => handleLike(post.id)}
                           className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors group/btn"
                         >
                            <Heart className={`h-4 w-4 group-hover/btn:scale-110 transition-transform ${post.likedBy?.some((l: { userId: string }) => l.userId === currentUserId) ? "fill-red-500 text-red-500" : ""}`} />
                            {post.likes}
                         </button>
                         <button className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group/btn">
                            <MessageCircle className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                            {post.comments?.length || 0}
                         </button>
                         <button className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group/btn ml-auto">
                            <Share2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                         </button>
                      </div>
                   </CardContent>
                </Card>
              ))
           ) : (
              <div className="text-center py-24 space-y-6">
                 <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="h-10 w-10 text-muted-foreground/30" />
                 </div>
                 <div className="space-y-2">
                     <h3 className="text-xl font-bold">The feed is empty.</h3>
                     <p className="text-muted-foreground font-medium">Be the first to share something with the community.</p>
                 </div>
              </div>
           )}
        </div>
      </main>

       {/* Right Sidebar - Trending & News - mobile shows below */}
       <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
          {/* Tech & Engineering News */}
          <Card className="border-border rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
             <CardContent className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 lg:gap-2 text-primary">
                    <Newspaper className="h-4 w-4 lg:h-5 lg:w-5" />
                    <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Global Tech News</h3>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                </div>
                
                <div className="space-y-3">
                   {news.length > 0 ? news.map((article) => (
                     <a 
                        key={article.id} 
                        href={article.slug.startsWith('rss') ? article.content : `/news/${article.slug}`} 
                        target={article.slug.startsWith('rss') ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className="group block space-y-1.5 p-2.5 rounded-xl lg:rounded-2xl hover:bg-secondary transition-colors"
                      >
                        <h4 className="text-[11px] lg:text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          {article.author} • {article.reading_time || '3m'} read
                        </p>
                      </a>
                   )) : (
                     <div className="py-8 text-center space-y-2">
                       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground font-medium">Loading latest news...</p>
                     </div>
                   )}
                </div>
            </CardContent>
         </Card>

          {/* Trending Subjects */}
          <Card className="border-border rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
             <CardContent className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center gap-1.5 lg:gap-2 text-primary">
                   <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                   <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Trending Topics</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { tag: "Calculus", posts: "1.2k" },
                    { tag: "KenyanHistory", posts: "850" },
                    { tag: "ExamPrep", posts: "640" },
                    { tag: "Scholarships", posts: "420" }
                  ].map((topic) => (
                     <div key={topic.tag} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-[11px] lg:text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">#{topic.tag}</span>
                        <span className="text-[8px] lg:text-[10px] font-black text-muted-foreground/50">{topic.posts} posts</span>
                     </div>
                  ))}
               </div>
            </CardContent>
         </Card>

          {/* Suggested Scholars */}
          <Card className="border-border rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
             <CardContent className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center gap-1.5 lg:gap-2 text-primary">
                   <UserPlus className="h-4 w-4 lg:h-5 lg:w-5" />
                   <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Top Scholars</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "John Doe", level: "University", points: "4.5k" },
                    { name: "Sarah W.", level: "High School", points: "3.2k" }
                  ].map((scholar) => (
                    <div key={scholar.name} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                             <AvatarFallback>{scholar.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                             <p className="text-xs font-bold">{scholar.name}</p>
                             <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{scholar.level}</p>
                          </div>
                       </div>
                       <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">Follow</Button>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
