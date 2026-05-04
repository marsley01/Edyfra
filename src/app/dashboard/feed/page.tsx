"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, MessageCircle, Share2, 
  Send, Image as ImageIcon, Search,
  MoreHorizontal, Loader2, TrendingUp,
  UserPlus, Hash, Users, Flame, Sparkles, Zap
} from "lucide-react";
import { getPosts, createPost, likePost } from "@/app/actions/feed";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [filter]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      toast.error("Failed to load feed");
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
      toast.success("Post shared with the ecosystem!");
      loadPosts();
    } catch (error) {
      toast.error("Deployment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans animate-in fade-in duration-700">
      {/* Left Sidebar - Navigation & Profile Summary */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <Card className="border-border rounded-3xl overflow-hidden shadow-sm sticky top-24">
           <div className="h-20 bg-primary/10" />
           <CardContent className="p-6 -mt-10 text-center space-y-4">
              <Avatar className="h-20 w-20 mx-auto border-4 border-background shadow-xl">
                 <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mash" />
                 <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                 <h3 className="text-xl font-black tracking-tight">Mash Scholar</h3>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">University • Computer Science</p>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-border">
                 <div className="text-center">
                    <p className="text-lg font-black">1.2k</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Following</p>
                 </div>
                 <div className="text-center">
                    <p className="text-lg font-black">840</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Points</p>
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-8">
        {/* Header & Filters */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black tracking-tighter">Knowledge <span className="text-primary">Sync</span></h1>
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
                       <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mash" />
                       <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <textarea 
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a discovery or ask a question..."
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
                       Synchronize
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
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving Ecosystem Data...</p>
              </div>
           ) : posts.length > 0 ? (
              posts.map((post) => (
                <Card key={post.id} className="border-border rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card">
                   <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border group-hover:scale-105 transition-transform">
                               <AvatarImage src={post.user.avatar} />
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
                              <img src={post.image} alt="Knowledge Visual" className="w-full h-auto object-cover max-h-[500px]" />
                           </div>
                        </div>
                      )}

                      <div className="flex items-center gap-8 pt-4 border-t border-border/50 pl-[52px]">
                         <button 
                           onClick={() => likePost(post.id)}
                           className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors group/btn"
                         >
                            <Heart className={`h-4 w-4 group-hover/btn:scale-110 transition-transform ${post.likedBy?.some((l: any) => l.userId === "current") ? "fill-red-500 text-red-500" : ""}`} />
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
                    <h3 className="text-xl font-bold">The ecosystem is quiet.</h3>
                    <p className="text-muted-foreground font-medium">Be the first to synchronize your knowledge with the network.</p>
                 </div>
              </div>
           )}
        </div>
      </main>

      {/* Right Sidebar - Trending & Suggestions */}
      <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
         {/* Trending Topics */}
         <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Trending Now</h3>
               </div>
               <div className="space-y-4">
                  {[
                    { tag: "#PureMaths", count: "1.2k scholars", icon: Flame },
                    { tag: "#KenyaAI", count: "840 active", icon: Zap },
                    { tag: "#FinalsSeason", count: "3.5k posts", icon: Flame },
                    { tag: "#MashAI", count: "500 prompts", icon: Sparkles },
                  ].map((topic) => (
                    <div key={topic.tag} className="flex items-center justify-between group cursor-pointer">
                       <div className="space-y-1">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">{topic.tag}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{topic.count}</p>
                       </div>
                       <topic.icon className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  ))}
               </div>
               <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">View All Trends</Button>
            </CardContent>
         </Card>

         {/* Suggested Scholars */}
         <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-6">
               <div className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Who to Follow</h3>
               </div>
               <div className="space-y-4">
                  {[
                    { name: "Dr. Kamau", school: "UoN", id: "1" },
                    { name: "Sarah Omondi", school: "Strathmore", id: "2" },
                    { name: "Physics Ninja", school: "JKUAT", id: "3" },
                  ].map((scholar) => (
                    <div key={scholar.id} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                             <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${scholar.name}`} />
                             <AvatarFallback>{scholar.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                             <p className="text-xs font-bold truncate">{scholar.name}</p>
                             <p className="text-[10px] text-muted-foreground font-medium">{scholar.school}</p>
                          </div>
                       </div>
                       <Button size="sm" variant="outline" className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Follow</Button>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
