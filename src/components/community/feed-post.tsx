"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquare, Repeat2, Share2, MoreHorizontal } from "lucide-react";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Button } from "@/components/ui/button";

interface FeedPostProps {
  author: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  syncs: number;
  comments: number;
}

export function FeedPost({ author, content, timestamp, likes: initialLikes, syncs, comments }: FeedPostProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 rounded-[2.5rem] bg-secondary border border-border/50 space-y-6 hover:bg-background hover:shadow-2xl hover:translate-y-[-2px] transition-all duration-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AvatarPremium seed={author.id} src={author.avatar} size="md" name={author.name} />
          <div>
            <h4 className="font-black text-sm tracking-tight">{author.name}</h4>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase tracking-widest text-primary">{author.role}</span>
               <div className="w-1 h-1 rounded-full bg-border" />
               <span className="text-[9px] font-bold text-muted-foreground uppercase">{timestamp}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-lg font-medium leading-relaxed text-foreground/90">
        {content}
      </p>

      <div className="pt-6 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1 md:gap-4">
           <button 
             onClick={handleLike}
             className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isLiked ? "bg-red-500/10 text-red-500" : "hover:bg-background text-muted-foreground"}`}
           >
             <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">{likes}</span>
           </button>
           <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-background text-muted-foreground transition-all">
             <MessageSquare className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">{comments}</span>
           </button>
           <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-background text-muted-foreground transition-all">
             <Repeat2 className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">{syncs}</span>
           </button>
        </div>
        <button className="p-2 rounded-full hover:bg-background text-muted-foreground transition-all">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
