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
  type LucideIcon,
} from "lucide-react";
import { changelog } from "@/data/changelog";

const icons: Record<number, LucideIcon> = {
  0: ShieldCheck,
  1: Video,
  2: Rocket,
};

const iconColors: Record<number, string> = {
  0: "bg-violet-500 text-white ring-violet-200 dark:ring-violet-900",
  1: "bg-blue-500 text-white ring-blue-200 dark:ring-blue-900",
  2: "bg-emerald-500 text-white ring-emerald-200 dark:ring-emerald-900",
};

const badgeColors: Record<number, string> = {
  0: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  1: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  2: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
};

function getIcon(index: number): LucideIcon {
  return icons[index] ?? Rocket;
}

export default function ChangelogPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen px-6 py-16 sm:px-8 lg:px-16 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl -z-10 dark:bg-indigo-900/20" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl -z-10 dark:bg-purple-900/20" />

      <div className="max-w-3xl mx-auto mb-16 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full mb-4">
          <Sparkles className="w-4 h-4" />
          <span>Fresh product drops</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          What&apos;s new?
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Every update, improvement, and fix — handcrafted for you.
        </p>
      </div>

      <div className="max-w-3xl mx-auto relative">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-200 via-blue-200 to-slate-200 dark:from-indigo-800 dark:via-blue-800 dark:to-slate-700" />

        <div className="space-y-8">
          {changelog.map((update, index) => {
            const IconComponent = getIcon(index);
            const isExpanded = expandedIndex === index;

            return (
              <div key={update.version} className="relative pl-14 group">
                <div
                  className={`absolute left-2 top-2 w-9 h-9 rounded-full flex items-center justify-center ring-4 transition-all duration-300 group-hover:scale-110 ${iconColors[index] ?? iconColors[0]}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                <div
                  onClick={() =>
                    setExpandedIndex(isExpanded ? null : index)
                  }
                  className="cursor-pointer bg-card border border-border/80 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeColors[index] ?? badgeColors[0]}`}
                      >
                        v{update.version}
                      </span>

                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{update.date}</span>
                      </div>
                    </div>

                    <div className="text-muted-foreground group-hover:text-foreground transition-colors self-end sm:self-auto">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {update.title}
                  </h3>

                  <p className="mt-2 text-muted-foreground leading-relaxed text-sm sm:text-base">
                    {update.description}
                  </p>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border text-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {update.highlights && update.highlights.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-foreground font-semibold">
                            <Star className="w-4 h-4 text-indigo-500" />
                            <span>What&apos;s new</span>
                          </div>
                          <ul className="space-y-1.5">
                            {update.highlights.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2.5 text-muted-foreground pl-1"
                              >
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
                              <li
                                key={i}
                                className="flex items-start gap-2.5 text-muted-foreground pl-1"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400/50 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
