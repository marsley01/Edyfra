"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, Sparkles, Zap, Trophy, BookOpen, Users, Star, CheckCircle } from "lucide-react";

export function HomeHero() {
  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20 pb-0">
      {/* Background blobs — hidden on iOS (GPU compositing conflict) */}
      <div className="absolute inset-0 z-0 pointer-events-none ios-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl space-y-10 w-full">
        {/* Hero text */}
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

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
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

        {/* ── Premium Dashboard Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full mx-auto mt-8 px-2 md:px-0"
        >
          {/* Floating badge — top left */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-8 -left-2 md:-left-6 z-20 hidden md:flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border rounded-2xl px-4 py-2.5 shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Match Found</p>
              <p className="text-sm font-black">Tutor connected!</p>
            </div>
          </motion.div>

          {/* Floating badge — top right */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -top-6 -right-2 md:-right-6 z-20 hidden md:flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border rounded-2xl px-4 py-2.5 shadow-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Points earned</p>
              <p className="text-sm font-black">+120 XP 🔥</p>
            </div>
          </motion.div>

          {/* Main mockup window */}
          <div className="relative rounded-[2rem] overflow-hidden border border-border/60 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] bg-background">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/60 border-b border-border/50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              <div className="flex-1 mx-4 h-5 rounded-full bg-background/80 flex items-center px-3">
                <span className="text-[10px] text-muted-foreground font-mono">edyfra.vercel.app/dashboard</span>
              </div>
            </div>

            {/* Dashboard interior */}
            <div className="grid grid-cols-12 min-h-[320px] md:min-h-[380px]">

              {/* Left sidebar */}
              <div className="col-span-2 hidden md:flex flex-col bg-background border-r border-border/50 p-4 gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mb-2">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                {[BookOpen, Users, Zap, Trophy].map((Icon, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-2 rounded-xl ${i === 0 ? "bg-primary text-white" : "text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div className="col-span-12 md:col-span-7 p-5 space-y-4 bg-background">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Good morning</p>
                    <h3 className="text-lg font-black tracking-tight">Welcome back, Alex 👋</h3>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Zap className="h-3 w-3" /> Find Match
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Sessions", value: "12", color: "bg-primary/10 text-primary" },
                    { label: "Points", value: "840", color: "bg-yellow-500/10 text-yellow-600" },
                    { label: "Streak", value: "7d 🔥", color: "bg-emerald-500/10 text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
                      <p className="text-xl font-black">{s.value}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mash AI Chat */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Mash AI
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-primary/10 text-primary text-xs font-medium rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%] text-left">
                      Let&apos;s pick up where we left off — ready to tackle quadratic equations?
                    </div>
                  </div>
                  <div className="flex gap-2 items-end justify-end">
                    <div className="bg-foreground text-background text-xs font-medium rounded-2xl rounded-br-sm px-3 py-2">
                      Yes! Show me the factoring method 🎯
                    </div>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-black">A</div>
                  </div>
                </div>
              </div>

              {/* Right panel — tutors */}
              <div className="col-span-3 hidden md:flex flex-col bg-muted/30 border-l border-border/50 p-4 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Top Tutors</p>
                {[
                  { name: "Dr. Wanjiku", subject: "Maths", rating: 4.9 },
                  { name: "Brian K.", subject: "Physics", rating: 4.8 },
                  { name: "Aisha M.", subject: "Biology", rating: 4.7 },
                ].map((t) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                      {t.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black truncate">{t.name}</p>
                      <p className="text-[9px] text-muted-foreground">{t.subject}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-[9px] font-black text-yellow-500">
                      <Star className="h-2.5 w-2.5 fill-current" />{t.rating}
                    </div>
                  </div>
                ))}

                <div className="mt-auto pt-3 border-t border-border/50">
                  <div className="p-3 rounded-xl bg-primary/10 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Daily Challenge</p>
                    <p className="text-xs font-bold mt-1 text-foreground">Algebra Quiz</p>
                    <div className="h-1.5 bg-primary/20 rounded-full mt-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1.5, delay: 1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom social proof badge */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/95 backdrop-blur-xl border border-border rounded-full px-6 py-2.5 shadow-xl whitespace-nowrap"
          >
            <div className="flex -space-x-2">
              {["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[8px] text-white font-black" style={{ backgroundColor: c }}>
                  {["A", "B", "C", "D"][i]}
                </div>
              ))}
            </div>
            <p className="text-xs font-black">
              <span className="text-primary">2,400+</span> students studying right now
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
