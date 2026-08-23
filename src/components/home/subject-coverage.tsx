"use client";

import { motion } from "framer-motion";

const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Kiswahili",
  "History",
  "Geography",
  "Business Studies",
  "Computer Science",
  "Economics",
  "Agriculture",
  "CRE",
  "IRE",
  "Art & Design",
  "Medicine",
  "Engineering",
  "Law",
  "Data Science",
  "Psychology",
  "Nursing",
  "Software Engineering",
  "Architecture",
];

export function SubjectCoverage() {
  return (
    <section className="border-t border-glass-stroke px-4 py-20 md:px-16">
      <div className="mx-auto max-w-screen-2xl space-y-lg">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl space-y-sm text-center"
        >
          <h2 className="text-headline-lg font-bold md:text-[40px] md:leading-[48px]">
            Your subject is covered.
          </h2>
          <p className="mx-auto max-w-2xl text-body-md text-on-surface-variant">
            Edyfra supports the full Kenyan curriculum — from KCPE through KCSE,
            University level, and beyond.
          </p>
        </motion.div>

        {/* Pill Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3"
        >
          {subjects.map((subject, i) => (
            <motion.span
              key={subject}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="glass-panel cursor-default select-none rounded-full px-4 py-2 text-sm font-medium transition-colors hover:border-brand-orange/50 hover:text-brand-orange"
            >
              {subject}
            </motion.span>
          ))}
        </motion.div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-center text-sm text-outline"
        >
          More subjects added based on community demand.
        </motion.p>
      </div>
    </section>
  );
}
