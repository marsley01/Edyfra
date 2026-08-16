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
    <section className="py-32 md:py-40 px-6">
      <div className="container-max space-y-16">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 text-center max-w-2xl mx-auto"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Subject Coverage
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tightest leading-none">
            Your subject is covered.
          </h2>
          <p className="text-muted-foreground font-medium text-lg">
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
          className="flex flex-wrap justify-center gap-3"
        >
          {subjects.map((subject, i) => (
            <motion.span
              key={subject}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="px-5 py-2.5 rounded-full border border-border/60 bg-secondary/40 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-default select-none"
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
          className="text-center text-sm text-muted-foreground/60 font-medium"
        >
          More subjects added based on community demand.
        </motion.p>
      </div>
    </section>
  );
}
