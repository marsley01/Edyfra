"use client";

import { motion } from "framer-motion";

export function LogoCloud() {
  const logos = [
    "UNIVERSITY OF NAIROBI",
    "STRATHMORE UNIVERSITY",
    "JKUAT",
    "KENYATTA UNIVERSITY",
    "USIU AFRICA",
    "EGERTON UNIVERSITY",
  ];

  return (
    <section className="py-24 border-y border-border/50">
      <div className="container-max space-y-12">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-center">
          Trusted by leading institutional ecosystems
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 grayscale opacity-30">
          {logos.map((logo) => (
            <motion.span
              key={logo}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-lg md:text-xl font-black tracking-tightest whitespace-nowrap"
            >
              {logo}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
