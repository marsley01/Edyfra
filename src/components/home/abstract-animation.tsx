"use client";

import { motion } from "framer-motion";

export function AbstractAnimation() {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-background flex items-center justify-center border-y border-border/50">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent z-0" />
      
      {/* Dynamic Orbs — hidden on iOS to avoid GPU compositing conflicts */}
      <div className="ios-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-primary/20 rounded-full blur-[60px] z-10 will-change-transform"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[350px] md:h-[350px] bg-emerald-500/10 rounded-full blur-[50px] z-10 will-change-transform"
        />

        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 180, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-purple-500/10 rounded-full blur-[70px] z-10"
        />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 z-20 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Floating Elements */}
      <div className="z-30 flex gap-8 items-center justify-center w-full max-w-4xl px-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="flex-1 max-w-[200px] aspect-square rounded-3xl border border-white/10 bg-white/5 shadow-2xl flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
            <div className="w-16 h-16 rounded-2xl border-2 border-primary/30 rotate-45" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
