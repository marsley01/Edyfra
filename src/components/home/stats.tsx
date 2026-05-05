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
    if (val === 0 && label !== "Uptime %") return "JOIN";
    return val.toLocaleString() + (value > 1000 ? "+" : value === 99 ? "%" : "");
  });

  useEffect(() => {
    if (inView) {
      spring.set(value || (label === "Uptime %" ? 99 : 0));
    }
  }, [inView, value, label, spring]);

  return (
    <div ref={ref} className="text-center space-y-4">
      <motion.div className="text-6xl md:text-7xl font-black tracking-tightest tabular-nums text-white">
        {label !== "Uptime %" && value === 0 ? (
          <span className="text-primary tracking-tighter">JOIN</span>
        ) : (
          display
        )}
      </motion.div>
      <div className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-primary/80">
        {value === 0 && label !== "Uptime %" ? `Our first 100 ${label}` : label}
      </div>
    </div>
  );
}

// Now accepts stats as props from the server component — no client-side fetch
export function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <section className="bg-black py-32 md:py-48 overflow-hidden relative">
      <div className="container-max grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-8">
        {stats.map((stat) => (
          <Counter key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
      <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[50%] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
    </section>
  );
}
