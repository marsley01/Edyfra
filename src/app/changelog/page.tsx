"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowUp,
  Bug,
  ChevronDown,
  Calendar,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { changelog } from "@/data/changelog";

const typeIcons = {
  features: Sparkles,
  improvements: ArrowUp,
  fixes: Bug,
} as const;

const typeColors = {
  features:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  improvements:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  fixes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
} as const;

function ChangelogCard({
  entry,
  index,
}: {
  entry: (typeof changelog)[number];
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  const sections = [
    { key: "features" as const, label: "New Features" },
    { key: "improvements" as const, label: "Improvements" },
    { key: "fixes" as const, label: "Bug Fixes" },
  ].filter((s) => entry[s.key]?.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "border-border/50 overflow-hidden transition-all duration-300",
          expanded ? "shadow-lg" : "shadow-sm hover:shadow-md"
        )}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="font-mono text-xs">
                    v{entry.version}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {entry.date}
                  </div>
                </div>
                <h3 className="text-lg font-bold tracking-tight">
                  {entry.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {entry.summary}
                </p>
              </div>
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 shrink-0"
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </div>
          </CardHeader>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="pt-4 pb-6 space-y-5">
                {sections.map(({ key, label }) => {
                  const Icon = typeIcons[key];
                  const items = entry[key]!;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div
                          className={cn(
                            "p-1 rounded-md border",
                            typeColors[key]
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold">{label}</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-xs font-mono"
                        >
                          {items.length}
                        </Badge>
                      </div>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground pl-1"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-28 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 text-primary mb-4">
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Changelog
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              What&apos;s new?
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Every update, improvement, and fix — handcrafted for you.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {changelog.map((entry, index) => (
            <ChangelogCard key={entry.version} entry={entry} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
