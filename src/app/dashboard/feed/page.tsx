"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, MessageCircle, Share2, 
  Send, Image as ImageIcon, Search,
  MoreHorizontal, Loader2, TrendingUp,
  UserPlus, Hash, Users, Flame, Sparkles, Zap, Newspaper
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
       const data = await getPosts();
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
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans animate-in fade-in duration-700">
      {/* Left Sidebar - Profile Summary */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <Card className="border-border rounded-3xl overflow-hidden shadow-sm sticky top-24">
           <div className="h-20 bg-primary/10" />
           <CardContent className="p-6 -mt-10 text-center space-y-4">
              <Avatar className="h-20 w-20 mx-auto border-4 border-background shadow-xl">
                 <AvatarFallback><Users className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                 <h3 className="text-xl font-black tracking-tight">Your Profile</h3>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Community Hub</p>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-8">
        {/* Header & Filters */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black tracking-tighter">Community <span className="text-primary">Feed</span></h1>
              <div className="flex bg-secondary p-1 rounded-xl gap-1">
                 {["all", "following", "school"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                       {f}
                    </button>
                 ))}
              </div>
           </div>

           {/* Post Composer */}
           <Card className="border-border rounded-3xl shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                 <div className="flex gap-4">
                    <Avatar className="h-12 w-12 border border-border">
                       <AvatarFallback><Send className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <textarea 
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What's on your mind? Share a discovery or ask a question..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium resize-none min-h-[80px] pt-2 placeholder:text-muted-foreground/40"
                    />
                 </div>
                 <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5">
                          <ImageIcon className="h-4 w-4 mr-2" /> Media
                       </Button>
                       <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5">
                          <Hash className="h-4 w-4 mr-2" /> Topic
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
                 </div>
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
                <Card key={post.id} className="border-border rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card">
                   <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border group-hover:scale-105 transition-transform">
                               <AvatarImage src={post.user.avatar || undefined} />
                               <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                               <div className="flex items-center gap-2">
                                  <h4 className="font-black text-sm tracking-tight">{post.user.name}</h4>
                                  <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                  <span className="text-[10px] font-bold text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                                </div>
                               <p className="text-[10px] font-black text-primary uppercase tracking-[0.05em]">{post.user.educationLevel?.replace("_", " ")} • {post.subject || "General"}</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                         </Button>
                      </div>

                      <div className="text-base font-medium leading-relaxed text-foreground/90 pl-[52px]">
                         {post.content}
                      </div>

                      {post.image && (
                        <div className="pl-[52px]">
                           <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                              <img src={post.image} alt="Post Visual" className="w-full h-auto object-cover max-h-[500px]" />
                           </div>
                        </div>
                      )}

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
                    <h3 className="text-xl font-bold">The feed is quiet.</h3>
                    <p className="text-muted-foreground font-medium">Be the first to share an update with the community.</p>
                 </div>
              </div>
           )}
        </div>
      </main>

      {/* Right Sidebar - Trending & News */}
      <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
         {/* Tech & Engineering News */}
         <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-primary">
                    <Newspaper className="h-5 w-5" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Global Tech News</h3>
                 </div>
                 <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
               </div>
               
                <div className="space-y-4">
                   {news.length > 0 ? news.map((article) => (
                     <a 
                       key={article.id} 
                       href={article.slug.startsWith('rss') ? article.content : `/news/${article.slug}`} 
                       target={article.slug.startsWith('rss') ? "_blank" : "_self"}
                       rel="noopener noreferrer"
                       className="group block space-y-2 p-3 rounded-2xl hover:bg-secondary transition-colors"
                     >
                       <h4 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                         {article.title}
                       </h4>
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                         {article.author} • {article.reading_time || "3m"} read
                       </p>
                     </a>
                   )) : (
                     <div className="py-8 text-center space-y-2">
                       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                       <p className="text-xs text-muted-foreground font-medium">Fetching global updates...</p>
                     </div>
                   )}
                </div>
            </CardContent>
         </Card>

         {/* Trending Subjects */}
         <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Trending Topics</h3>
               </div>
               <div className="space-y-3">
                  {[
                    { tag: "Calculus", posts: "1.2k" },
                    { tag: "KenyanHistory", posts: "850" },
                    { tag: "ExamPrep", posts: "640" },
                    { tag: "Scholarships", posts: "420" }
                  ].map((topic) => (
                    <div key={topic.tag} className="flex items-center justify-between group cursor-pointer">
                       <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">#{topic.tag}</span>
                       <span className="text-[10px] font-black text-muted-foreground/50">{topic.posts} posts</span>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>

         {/* Suggested Scholars */}
         <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center gap-2 text-primary">
                  <UserPlus className="h-5 w-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Top Scholars</h3>
               </div>
               <div className="space-y-4">
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
