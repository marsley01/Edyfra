"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    heading: "Create your account",
    lines: [
      "Sign up in under a minute.",
      "Tell us your level and what you are studying.",
    ],
  },
  {
    number: "02",
    heading: "Get matched instantly",
    lines: [
      "Our algorithm connects you to a peer, verified tutor, or Mash AI",
      "based on your exact subject and level.",
    ],
  },
  {
    number: "03",
    heading: "Study and grow",
    lines: [
      "Track your progress, earn points, complete challenges,",
      "and build a consistent study habit.",
    ],
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 md:py-48 px-6">
      <div className="container-max space-y-20">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            How It Works
          </p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tightest leading-none">
            Three steps to your
            <br />
            <span className="text-primary">best study session.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="space-y-6 p-8 rounded-[2rem] border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors"
            >
              <span className="text-5xl font-black tracking-tightest text-primary/20 select-none">
                {step.number}
              </span>
              <h3 className="text-xl font-black tracking-tightest text-foreground">
                {step.heading}
              </h3>
              <div className="space-y-1">
                {step.lines.map((line, j) => (
                  <p key={j} className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
