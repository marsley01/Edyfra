"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    heading: "Create your account",
    description:
      "Sign up in under a minute and tell us your level and what you are studying.",
  },
  {
    number: "02",
    heading: "Get matched instantly",
    description:
      "Our algorithm connects you to a peer, verified tutor, or Mash AI based on your exact subject and level.",
  },
  {
    number: "03",
    heading: "Study and grow",
    description:
      "Track your progress, earn points, complete challenges, and build a consistent study habit.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-glass-stroke px-4 py-20 md:px-16">
      <div className="mx-auto max-w-screen-2xl">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 text-center"
        >
          <span className="mb-3 block font-semibold uppercase tracking-[0.18em] text-label-sm text-brand-orange">
            How It Works
          </span>
          <h2 className="text-headline-lg font-bold md:text-[40px] md:leading-[48px]">
            Three steps to your <br className="hidden md:block" />
            best study session.
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
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
              className="glass-card group flex flex-col items-center p-12 text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-2xl font-bold text-brand-orange transition-colors group-hover:bg-brand-orange group-hover:text-deep-void">
                {step.number}
              </div>
              <h3 className="mb-3 text-title-md font-bold">{step.heading}</h3>
              <p className="text-balance text-body-md leading-relaxed text-on-surface-variant">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
