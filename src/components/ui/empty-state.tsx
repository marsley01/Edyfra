"use client";

import { motion } from "framer-motion";
import { LucideIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon: Icon = Info, 
  title, 
  description, 
  actionText, 
  onAction,
  className = "" 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center p-12 md:p-24 text-center space-y-6 bg-secondary/30 rounded-[3rem] border-2 border-dashed border-border ${className}`}
    >
      <div className="w-20 h-20 rounded-[2rem] bg-background flex items-center justify-center text-muted-foreground/30 shadow-sm border border-border">
         <Icon className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl md:text-3xl font-black tracking-tightest">{title}</h3>
        <p className="text-muted-foreground font-medium text-lg max-w-sm mx-auto">{description}</p>
      </div>
      {actionText && (
        <Button 
          onClick={onAction}
          className="h-12 px-8 rounded-full bg-foreground text-background font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-foreground/90 transition-all active:scale-95"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
}
