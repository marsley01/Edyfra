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
      className="p-6 md:p-8 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AvatarPremium seed={author.id} src={author.avatar} size="md" name={author.name} />
          <div>
            <h4 className="font-semibold text-sm text-foreground">{author.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent">{author.role}</span>
               <div className="w-1 h-1 rounded-sm bg-border" />
               <span className="text-[10px] font-medium text-muted-foreground">{timestamp}</span>
            </div>
          </div>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-card transition-colors cursor-pointer">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <p className="text-base font-normal leading-relaxed text-foreground/85 mt-5">
        {content}
      </p>

      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-1">
           <button
             onClick={handleLike}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
               isLiked
                 ? "bg-brand-accent/10 text-brand-accent"
                 : "text-muted-foreground hover:bg-brand-accent/5 hover:text-brand-accent"
             }`}
           >
             <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
             <span>{likes}</span>
           </button>
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">
              <MessageSquare className="h-4 w-4" />
              <span>{comments}</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">
             <Repeat2 className="h-4 w-4" />
             <span>{syncs}</span>
           </button>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
