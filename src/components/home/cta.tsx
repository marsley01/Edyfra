"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Users, Play } from "lucide-react";

export function HomeCTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);
  const videoY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.6, 1, 1, 0.6]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen max-h-[900px] min-h-[600px] flex items-center justify-center overflow-hidden"
    >
      {/* ── Video Background ── */}
      <motion.div
        style={{ scale: videoScale, y: videoY }}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {/* Loading placeholder */}
        {!videoLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-foreground/10 animate-pulse" />
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-[1500ms] ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/videos/hero-cta.webm" type="video/webm" />
        </video>
      </motion.div>

      {/* ── Gradient Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 z-10" />

      {/* ── Subtle Grid Pattern ── */}
      <div
        className="absolute inset-0 z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Floating Decorative Badges ── */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[12%] right-[8%] z-20 hidden lg:flex items-center gap-2.5 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl"
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Play className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Active Learning</p>
          <p className="text-sm font-bold text-white">12,400+ sessions</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="absolute bottom-[18%] left-[6%] z-20 hidden lg:flex items-center gap-2.5 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl"
      >
        <div className="flex -space-x-2">
          {["#00F0FF", "#9D4EDD", "#E07A5F", "#39FF14"].map((c, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-black/40 flex items-center justify-center text-[7px] text-white font-bold"
              style={{ backgroundColor: c }}
            >
              {["M", "K", "A", "J"][i]}
            </div>
          ))}
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Study Buddies</p>
          <p className="text-sm font-bold text-white">500+ online now</p>
        </div>
      </motion.div>

      {/* ── Main Content Card ── */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 w-full max-w-4xl mx-auto px-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.12] rounded-[2.5rem] p-8 sm:p-12 md:p-16 shadow-[0_0_80px_-20px_rgba(0,0,0,0.3)]"
        >
          <div className="space-y-8 text-center">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] rounded-full px-4 py-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Kenya&apos;s Study Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-[0.9] text-white"
            >
              Your study
              <br />
              <span className="bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-[#E07A5F] bg-clip-text text-transparent">
                starts now.
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg md:text-xl text-white/60 font-medium max-w-xl mx-auto leading-relaxed"
            >
              Mash AI, verified tutors, and a community of Kenyan scholars — all in one place.
              Free to start, built for steady progress.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/signup">
                <Button className="group h-14 px-10 rounded-full bg-white text-foreground hover:bg-white/90 font-bold text-sm transition-all active:scale-95 shadow-2xl flex items-center gap-2">
                  Create My Study Space
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="h-14 px-10 rounded-full border-white/20 text-white hover:bg-white/10 font-bold text-sm transition-all flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  See The Mission
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="flex items-center justify-center gap-3 pt-4"
            >
              <div className="flex -space-x-2">
                {["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#E07A5F"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-black/30 flex items-center justify-center text-[8px] text-white font-bold shadow-lg"
                    style={{ backgroundColor: c }}
                  >
                    {["A", "B", "C", "D", "E"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/70">
                <span className="font-bold text-white">2,400+</span> students studying right now
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Bottom fade for section transition ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
    </section>
  );
}
