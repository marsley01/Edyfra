"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HomeCTA() {
  return (
    <section className="py-32 md:py-48 px-6">
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black rounded-[3rem] md:rounded-[4rem] p-12 md:p-32 text-center space-y-12 relative overflow-hidden shadow-2xl"
        >
          {/* Background Polish */}
          <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[50%] h-full bg-blue-500/10 blur-[120px] rounded-full" />

          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl md:text-8xl font-black tracking-tightest leading-none text-white">
              Build your <br />
              <span className="text-primary">study rhythm.</span>
            </h2>
            <p className="text-lg md:text-2xl text-white/60 font-medium max-w-xl mx-auto">
              Create your account, tell Edyfra what you are studying, and get a dashboard that grows with your goals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button className="w-full h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
                  Create My Study Space
                </Button>
              </Link>
              <Link href="/about" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full h-16 px-12 rounded-full border-white/20 text-white hover:bg-white/10 font-black text-xs tracking-widest uppercase transition-all">
                  See The Mission
                </Button>
              </Link>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 pt-4">
              Free to start. Built for steady progress.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
