"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const mockMessages = [
  {
    role: "student",
    text: "I keep getting confused with quadratic equations — I never know when to factorise vs use the formula.",
  },
  {
    role: "mash",
    text: "Great question. Let's figure out which method fits best. Can you show me the equation you're working on right now?",
  },
  {
    role: "student",
    text: "It's 2x² + 5x - 3 = 0",
  },
  {
    role: "mash",
    text: "Perfect. Before I show you the answer — check the coefficient of x². What does that tell you about which method to try first?",
  },
];

export function MashSpotlight() {
  return (
    <section className="py-32 md:py-48 px-6 bg-secondary/10">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                AI Study Companion
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tightest leading-none">
                Meet Mash —<br />
                <span className="text-primary">your AI study companion.</span>
              </h2>
            </div>
            <p className="text-lg font-medium text-muted-foreground leading-relaxed max-w-md">
              Mash steps in when no partner is available, guides you through
              tough questions without giving you the answers, and remembers your
              subject so every conversation feels personal.
            </p>
            <Link href="/signup">
              <Button className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-primary/20 transition-all active:scale-95">
                Try Mash
              </Button>
            </Link>
          </motion.div>

          {/* Right — Mock Chat */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[2rem] border border-border/50 bg-background overflow-hidden shadow-2xl"
          >
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-secondary/30">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">
                  Mash AI
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Always available
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                  Online
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="p-6 space-y-4 min-h-[320px]">
              {mockMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${
                      msg.role === "student"
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm border border-border/50"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Bar (visual only) */}
            <div className="px-6 py-4 border-t border-border/50 bg-secondary/20">
              <div className="h-11 rounded-xl bg-secondary/60 border border-border/50 flex items-center px-4">
                <span className="text-sm text-muted-foreground/50 font-medium">
                  Ask Mash anything...
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
