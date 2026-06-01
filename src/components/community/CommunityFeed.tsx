"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getPosts, createPost, likePost, addComment } from "@/app/actions/feed";
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

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
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

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPosts(filter);
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
  }, [filter]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost(newPostContent);
      setNewPostContent("");
      toast.success("Shared with the community!", { icon: <span>✅</span> });
      loadPosts();
    } catch {
      toast.error("Failed to share post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    setLikingPosts(prev => new Set(prev).add(postId));

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
      loadPosts();
    }
    setTimeout(() => setLikingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 500);
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setSubmittingComment(postId);
    try {
      await addComment(postId, content);
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      toast.success("Comment added");
      loadPosts();
    } catch {
      toast.error("Failed to add comment");
    }
    setSubmittingComment(null);
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleShare = async (post: Post) => {
    if (navigator.share) {
      await navigator.share({
        title: `${post.user.name} shared on Edyfra`,
        text: post.content,
        url: typeof window !== "undefined" ? window.location.href : "/dashboard/feed",
      });
    } else {
      await navigator.clipboard.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 animate-in fade-in duration-700">
      {/* Left Sidebar - Profile Summary */}
      <div className="hidden lg:block lg:col-span-3 space-y-4 lg:space-y-6">
        <Card className="border-border/50 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm sticky top-20 bg-gradient-to-b from-card to-secondary/30">
          <div className="h-16 lg:h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="p-4 lg:p-6 -mt-10 text-center space-y-3">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20 mx-auto border-4 border-background shadow-xl ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10">
                <span className="text-xl lg:text-2xl">👤</span>
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg lg:text-xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Your Profile</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Community Hub</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-br from-orange-500/5 via-transparent to-transparent">
          <CardContent className="p-4 lg:p-6 space-y-3">
            <div className="flex items-center gap-2 text-orange-500">
              <span className="text-base leading-none">🔥</span>
              <h3 className="text-[10px] font-black uppercase tracking-widest">Daily Streak</h3>
            </div>
            <p className="text-2xl font-black text-orange-500">0</p>
            <p className="text-[9px] text-muted-foreground font-medium">Keep learning every day!</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-4 lg:space-y-8">
        {/* Header & Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tighter">
              Community <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Feed</span>
            </h1>
            <div className="flex bg-secondary/80 p-1 rounded-xl gap-1 backdrop-blur-sm">
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
          <Card className="border-border/50 rounded-2xl lg:rounded-3xl shadow-sm bg-gradient-to-b from-card to-secondary/20 hover:shadow-md transition-shadow">
            <CardContent className="p-4 lg:p-6 space-y-3">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 lg:h-12 lg:w-12 border border-border ring-1 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-lg">
                    ✏️
                  </AvatarFallback>
                </Avatar>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind? Share a discovery or ask a question..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base lg:text-lg font-medium resize-none min-h-[60px] lg:min-h-[80px] pt-2 placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" className="rounded-full gap-2 text-muted-foreground hover:text-primary">
                  <span className="text-base leading-none">📷</span>
                  <span className="hidden sm:inline">Photo</span>
                </Button>
              </div>
              <Button
                onClick={handleCreatePost}
                disabled={isSubmitting || !newPostContent.trim()}
                className="rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 font-black text-[10px] tracking-widest uppercase px-8 h-10 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="mr-1">📤</span>}
                Post
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3 w-3 bg-primary rounded-full animate-ping opacity-40" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading your feed...</p>
            </div>
          ) : posts.length > 0 ? (
            posts.map((post: Post, index: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-border/50 rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden bg-gradient-to-b from-card to-secondary/10">
                  <CardContent className="p-4 lg:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 lg:h-10 lg:w-10 border-2 border-border group-hover:border-primary/30 transition-all ring-1 ring-primary/5">
                          <AvatarImage src={post.user.avatar || undefined} />
                          <AvatarFallback className="text-[10px] lg:text-xs bg-gradient-to-br from-primary/20 to-purple-500/20">
                            {post.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm lg:text-base tracking-tight">{post.user.name}</h4>
                            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                            <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                          </div>
                          <p className="text-[9px] lg:text-[10px] font-black text-primary uppercase tracking-[0.05em]">{post.user.educationLevel?.replace('_', ' ') || 'Student'} {post.subject ? <span className="text-muted-foreground">· {post.subject}</span> : null}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground text-lg leading-none">
                        ⋯
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="text-sm lg:text-base font-medium leading-relaxed text-foreground/90 pl-[44px] lg:pl-[52px]">
                      {post.content}
                    </div>

                    {/* Image */}
                    {post.image && (
                      <div className="pl-[44px] lg:pl-[52px]">
                        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm">
                          <Image
                            src={post.image}
                            alt="Post visual"
                            width={800}
                            height={500}
                            className="w-full h-auto object-cover max-h-[400px] lg:max-h-[500px] hover:scale-[1.02] transition-transform duration-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 lg:gap-8 pt-3 border-t border-border/50 pl-[44px] lg:pl-[52px]">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 text-[11px] lg:text-xs font-bold transition-all duration-200 ${post.likedBy?.some((l: { userId: string }) => l.userId === currentUserId) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      >
                        <span className={`text-base leading-none transition-all duration-200 ${likingPosts.has(post.id) ? "scale-125 inline-block" : ""}`}>
                          {post.likedBy?.some((l: { userId: string }) => l.userId === currentUserId) ? "❤️" : "🤍"}
                        </span>
                        {post.likes}
                      </button>
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                      >
                        <span className="text-base leading-none">💬</span>
                        {post.comments?.length || 0}
                      </button>
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-muted-foreground hover:text-primary transition-colors ml-auto"
                      >
                        <span className="text-base leading-none">↗️</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {expandedComments.has(post.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 border-t border-border/50 pl-[44px] lg:pl-[52px] space-y-3">
                            {/* Existing Comments */}
                            {post.comments?.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {post.comments.map((comment: any) => (
                                  <div key={comment.id} className="flex items-start gap-2 p-2 rounded-xl bg-secondary/30">
                                    <Avatar className="h-6 w-6 flex-shrink-0">
                                      <AvatarFallback className="text-[8px] bg-primary/10">
                                        {comment.user?.name?.[0] || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold">{comment.user?.name || "Anonymous"}</span>
                                        <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                                      </div>
                                      <p className="text-[12px] text-foreground/80">{comment.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment Input */}
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarFallback className="text-[8px] bg-primary/10">
                                  {currentUserId?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-1.5 border border-border/50 focus-within:border-primary/30 transition-colors">
                                <input
                                  value={commentInputs[post.id] || ""}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  placeholder="Write a comment..."
                                  className="flex-1 bg-transparent border-none focus:ring-0 text-[12px] outline-none placeholder:text-muted-foreground/40"
                                  onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id); }}
                                />
                                <button
                                  onClick={() => handleComment(post.id)}
                                  disabled={submittingComment === post.id || !commentInputs[post.id]?.trim()}
                                  className="text-primary hover:text-primary/80 transition-colors disabled:opacity-30 text-lg leading-none"
                                >
                                  {submittingComment === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "➡️"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 space-y-6"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto ring-2 ring-primary/20 text-3xl">
                ✨
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">The feed is empty.</h3>
                <p className="text-muted-foreground font-medium">Be the first to share something with the community.</p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
        {/* Tech News */}
        <Card className="border-border/50 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
          <CardContent className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 lg:gap-2 text-blue-500">
                <span className="text-base leading-none">📰</span>
                <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Global Tech News</h3>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            </div>

            <div className="space-y-3">
              {news.length > 0 ? news.map((article) => (
                <a
                  key={article.id}
                  href={article.slug.startsWith('rss') ? article.content : `/news/${article.slug}`}
                  target={article.slug.startsWith('rss') ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="group block space-y-1.5 p-2.5 rounded-xl lg:rounded-2xl hover:bg-blue-500/5 transition-colors"
                >
                  <h4 className="text-[11px] lg:text-sm font-bold leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
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

        {/* Trending Topics */}
        <Card className="border-border/50 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-br from-purple-500/5 via-transparent to-transparent">
          <CardContent className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-1.5 lg:gap-2 text-purple-500">
              <span className="text-base leading-none">📈</span>
              <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Trending Topics</h3>
            </div>
            <div className="space-y-2">
              {[
                { tag: "Calculus", posts: "1.2k" },
                { tag: "KenyanHistory", posts: "850" },
                { tag: "ExamPrep", posts: "640" },
                { tag: "Scholarships", posts: "420" },
                { tag: "STEM", posts: "310" },
              ].map((topic, i) => (
                <div key={topic.tag} className="flex items-center justify-between group cursor-pointer p-1.5 rounded-lg hover:bg-purple-500/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground/30 w-4">{i + 1}</span>
                    <span className="text-[11px] lg:text-sm font-bold text-muted-foreground group-hover:text-purple-500 transition-colors">#{topic.tag}</span>
                  </div>
                  <span className="text-[8px] lg:text-[10px] font-black text-muted-foreground/50">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggested Scholars */}
        <Card className="border-border/50 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <CardContent className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-1.5 lg:gap-2 text-emerald-500">
              <span className="text-base leading-none">🏆</span>
              <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest">Top Scholars</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: "John Doe", level: "University", points: "4.5k" },
                { name: "Sarah W.", level: "High School", points: "3.2k" },
                { name: "Kevin M.", level: "University", points: "2.8k" },
              ].map((scholar) => (
                <div key={scholar.name} className="flex items-center justify-between group p-2 rounded-xl hover:bg-emerald-500/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 ring-2 ring-emerald-500/20">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                        {scholar.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold">{scholar.name}</p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{scholar.level} · {scholar.points} pts</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10">
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
