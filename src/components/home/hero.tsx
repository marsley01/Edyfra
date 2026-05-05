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
            The ultimate academic ecosystem for Kenyan scholars. Connect with verified mentors, master the 8-4-4 and CBC, and achieve your true potential.
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
        </motion.div>

        {/* Trust badge removed as per request to clear demo data */}
      </div>

      {/* Floating Animation Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 40 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-24 w-full max-w-4xl mx-auto px-4"
      >
        <div className="relative aspect-[16/9] rounded-[2.5rem] bg-secondary border-8 border-background shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5" />
           
           {/* 
             TODO: To use a Lottie JSON here:
             1. Add your JSON file (e.g., hero-animation.json) to the project.
             2. Import the component: import { LottieAnimation } from "@/components/lottie-animation";
             3. Import the data: import animationData from "@/hero-animation.json";
             4. Replace this div with: <LottieAnimation animationData={animationData} className="w-full h-full object-cover" />
           */}
           <div className="text-center space-y-4 relative z-10 p-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                 <Play className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium text-sm">Interactive JSON Animation Goes Here</p>
           </div>
        </div>
      </motion.div>
    </section>
  );
}
