"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { LottieAnimation } from "@/components/lottie-animation";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function HomeHero() {
  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
            Your personal study base for school, revision, mentorship, and momentum. Mash AI, verified tutors, and real students help you move from stuck to ready.
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
              Start Your Study Plan
            </Button>
          </Link>
          <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="h-16 px-10 rounded-full border-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-black text-xs tracking-widest uppercase transition-all flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              Join Student Updates
            </Button>
          </a>
        </motion.div>
      </div>

      {/* Real Lottie Animation Section */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 40 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-24 w-full max-w-4xl mx-auto px-4"
      >
        <div className="relative aspect-[16/9] rounded-[2.5rem] bg-secondary/30 backdrop-blur-sm border-8 border-background shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden flex items-center justify-center group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5" />
          
          {isClient && (
            <LottieAnimation 
              url="https://lottie.host/64294a73-6112-421b-8f35-97e373d3119c/WvH6HIsi3b.json" 
              className="w-full h-full max-w-lg scale-110"
            />
          )}
        </div>
      </motion.div>
    </section>
  );
}
