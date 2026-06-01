"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-12">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[160px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 space-y-8 max-w-2xl">
         <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 rounded-[2rem] bg-secondary border border-border flex items-center justify-center mx-auto shadow-2xl"
         >
            <Zap className="h-10 w-10 text-primary animate-bounce" />
         </motion.div>

         <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Status: Synchronizing</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-tight">
               Protocol <br /> <span className="text-muted-foreground">Pending.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
               This module is currently being architected for the 2025 Edyfra roadmap. Our mission-critical engineers are synchronizing the final layers.
            </p>
         </div>

         <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/">
               <Button className="h-14 px-12 rounded-full bg-foreground text-background font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-foreground/90 transition-all active:scale-95">
                  Return to Command Center
               </Button>
            </Link>
            <Button variant="ghost" className="h-14 px-8 rounded-full font-black text-[10px] tracking-widest uppercase flex items-center gap-2">
               <Sparkles className="h-4 w-4" /> Roadmap 2025
            </Button>
         </div>
      </div>

      <div className="relative z-10 pt-24">
         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic">
            &quot;The future belongs to those who synchronize their knowledge today.&quot;
         </p>
      </div>
    </div>
  );
}
