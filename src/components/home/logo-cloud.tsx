"use client";

import { motion } from "framer-motion";

export function LogoCloud() {
  return (
    <section className="py-16 border-y border-border/30">
      <div className="container-max flex justify-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-sm font-medium text-muted-foreground/60 tracking-wide text-center"
        >
          Built for Kenyan students, from Form 1 to final year.
        </motion.p>
      </div>
    </section>
  );
}
