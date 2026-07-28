"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Rocket,
  ShieldCheck,
  Video,
  Bug,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LottieAnimation } from "@/components/lottie-animation";
import type { ChangelogEntry } from "@/data/changelog";

interface Props {
  entries: ChangelogEntry[];
}

const icons: LucideIcon[] = [ShieldCheck, Video, Rocket, Zap, Star];

const iconColors = [
  "bg-violet-500 text-white ring-violet-200 dark:ring-violet-900",
  "bg-blue-500 text-white ring-blue-200 dark:ring-blue-900",
  "bg-emerald-500 text-white ring-emerald-200 dark:ring-emerald-900",
  "bg-amber-500 text-white ring-amber-200 dark:ring-amber-900",
  "bg-rose-500 text-white ring-rose-200 dark:ring-rose-900",
];

const badgeColors = [
  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
];

export function ChangelogClient({ entries }: Props) {
  // Start with the latest entry expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen px-6 py-16 sm:px-8 lg:px-16 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl -z-10 dark:bg-indigo-900/20" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl -z-10 dark:bg-purple-900/20" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto mb-16 flex flex-col sm:flex-row sm:items-center gap-8"
      >
        {/* Lottie Rocket */}
        <div className="shrink-0">
          <LottieAnimation
            url="/animations/study-spinner.json"
            className="w-20 h-20"
            ariaLabel="Rocket launch animation"
          />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full">
            <Sparkles className="w-4 h-4" />
            <span>Fresh product drops</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            What&apos;s new?
          </h1>
          <p className="text-lg text-muted-foreground">
            Every update, improvement, and fix — handcrafted for you.
          </p>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="max-w-3xl mx-auto relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-200 via-blue-200 to-slate-200 dark:from-indigo-800 dark:via-blue-800 dark:to-slate-700" />

        <div className="space-y-8">
          {entries.map((update, index) => {
            const IconComponent = icons[index % icons.length];
            const isExpanded = expandedIndex === index;
            const iconClass = iconColors[index % iconColors.length];
            const badgeClass = badgeColors[index % badgeColors.length];

            return (
              <motion.div
                key={update.version}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative pl-14 group"
              >
                {/* Icon dot */}
                <div
                  className={`absolute left-2 top-2 w-9 h-9 rounded-full flex items-center justify-center ring-4 transition-all duration-300 group-hover:scale-110 ${iconClass}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Card */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="cursor-pointer bg-card border border-border/80 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border hover:-translate-y-0.5 select-none"
                >
                  {/* Card header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeClass}`}>
                        v{update.version}
                      </span>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{update.date}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground group-hover:text-foreground transition-colors self-end sm:self-auto">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {update.title}
                  </h3>

                  <p className="mt-2 text-muted-foreground leading-relaxed text-sm sm:text-base">
                    {update.description}
                  </p>

                  {/* Expandable content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key="details"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border text-sm space-y-4">
                          {update.highlights && update.highlights.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 text-foreground font-semibold">
                                <Star className="w-4 h-4 text-indigo-500" />
                                <span>What&apos;s new</span>
                              </div>
                              <ul className="space-y-1.5">
                                {update.highlights.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2.5 text-muted-foreground pl-1">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400/50 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {update.fixes && update.fixes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 text-foreground font-semibold">
                                <Bug className="w-4 h-4 text-amber-500" />
                                <span>Fixes</span>
                              </div>
                              <ul className="space-y-1.5">
                                {update.fixes.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2.5 text-muted-foreground pl-1">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400/50 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
