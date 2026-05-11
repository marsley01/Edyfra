"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface Stat {
  value: number;
  label: string;
}

interface CounterProps {
  value: number;
  label: string;
}

function Counter({ value, label }: CounterProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const springConfig = useMemo(() => ({ stiffness: 50, damping: 20 }), []);
  const spring = useSpring(0, springConfig);
  const display = useTransform(spring, (v) => {
    const val = Math.floor(v);
    return val.toLocaleString() + (val > 1000 ? "+" : "");
  });

  useEffect(() => {
    if (inView && value > 0) {
      spring.set(value);
    }
  }, [inView, value, spring]);

  const isEmpty = value === 0;

  return (
    <div ref={ref} className="text-center space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-5xl md:text-6xl font-black tracking-tightest tabular-nums text-white"
      >
        {isEmpty ? (
          <span className="text-3xl md:text-4xl font-black tracking-tight text-primary/70">
            Growing Daily
          </span>
        ) : (
          <motion.span>{display}</motion.span>
        )}
      </motion.div>
      <div className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-primary/80">
        {label}
      </div>
    </div>
  );
}

// Accepts real stats from the server component — no client-side fetch needed
export function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <section className="bg-black py-32 md:py-48 overflow-hidden relative">
      <div className="container-max grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
        {stats.map((stat) => (
          <Counter key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
      <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[50%] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
    </section>
  );
}
