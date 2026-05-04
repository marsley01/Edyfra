"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
      {/* Background Polish */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tightest leading-[0.9] text-foreground">
            Education, <br />
            <span className="text-primary">reimagined.</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform where students discover, connect, and grow. Designed for the mission-critical scholar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link href="/signup">
            <Button className="h-16 px-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
              Get Started Free
            </Button>
          </Link>
          <Button variant="ghost" className="h-16 px-12 rounded-full font-black text-xs tracking-widest uppercase group transition-all">
            Watch Demo <Play className="ml-2 h-4 w-4 fill-current group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground pt-8"
        >
          Trusted by 10,000+ students across Africa
        </motion.p>
      </div>

      {/* Floating Product Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 40 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-24 w-full max-w-6xl mx-auto px-4"
      >
        <div className="relative aspect-[16/9] rounded-[2.5rem] bg-secondary border-8 border-background shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5" />
           <img 
             src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop" 
             alt="Dashboard Preview" 
             className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
           />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500">
                 <Play className="h-8 w-8 text-white fill-current" />
              </div>
           </div>
        </div>
      </motion.div>
    </section>
  );
}
