"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  Target,
  Lightbulb,
  PenTool,
  GraduationCap,
  Brain,
  Bookmark,
  Atom,
  Dna,
  Globe,
  Landmark,
  Quote,
  Calculator,
  FlaskConical,
  ScrollText,
} from "lucide-react";

interface StudyRoomSidePanelProps {
  subject: string;
  topic?: string;
  className?: string;
}

const SUBJECT_RESOURCES: Record<string, { icon: typeof BookOpen; color: string; concepts: string[] }> = {
  Mathematics: {
    icon: Calculator,
    color: "from-blue-500/20 to-violet-500/10",
    concepts: ["Formulas & Theorems", "Practice Problems", "Step-by-step solutions"],
  },
  Physics: {
    icon: Atom,
    color: "from-amber-500/20 to-orange-500/10",
    concepts: ["Laws & Principles", "Derivations", "Real-world applications"],
  },
  Chemistry: {
    icon: FlaskConical,
    color: "from-emerald-500/20 to-teal-500/10",
    concepts: ["Periodic trends", "Reaction mechanisms", "Stoichiometry"],
  },
  Biology: {
    icon: Dna,
    color: "from-green-500/20 to-emerald-500/10",
    concepts: ["Key processes", "Diagrams & labelling", "Definitions"],
  },
  Geography: {
    icon: Globe,
    color: "from-sky-500/20 to-cyan-500/10",
    concepts: ["Physical geography", "Map work", "Climatic regions"],
  },
  History: {
    icon: Landmark,
    color: "from-rose-500/20 to-pink-500/10",
    concepts: ["Chronological events", "Causes & effects", "Key figures"],
  },
  English: {
    icon: Quote,
    color: "from-purple-500/20 to-fuchsia-500/10",
    concepts: ["Grammar rules", "Literary devices", "Essay structure"],
  },
  Kiswahili: {
    icon: ScrollText,
    color: "from-yellow-500/20 to-amber-500/10",
    concepts: ["Semi za lugha", "Misamiati", "Sarufi"],
  },
};

const SUBJECT_BACKGROUNDS: Record<string, { gradient: string; pattern: string }> = {
  Mathematics: {
    gradient: "from-blue-500/5 via-violet-500/5 to-transparent",
    pattern: "radial-gradient(circle at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%)",
  },
  Physics: {
    gradient: "from-amber-500/5 via-orange-500/5 to-transparent",
    pattern: "radial-gradient(circle at 80% 30%, rgba(245,158,11,0.08) 0%, transparent 50%)",
  },
  Chemistry: {
    gradient: "from-emerald-500/5 via-teal-500/5 to-transparent",
    pattern: "radial-gradient(circle at 40% 70%, rgba(16,185,129,0.08) 0%, transparent 50%)",
  },
  Biology: {
    gradient: "from-green-500/5 via-emerald-500/5 to-transparent",
    pattern: "radial-gradient(circle at 60% 40%, rgba(34,197,94,0.08) 0%, transparent 50%)",
  },
};

function getSubjectMeta(subject: string) {
  const key = Object.keys(SUBJECT_RESOURCES).find(
    (k) => k.toLowerCase() === subject.toLowerCase()
  );
  return key ? SUBJECT_RESOURCES[key] : SUBJECT_RESOURCES.Mathematics;
}

function getSubjectBg(subject: string) {
  const key = Object.keys(SUBJECT_BACKGROUNDS).find(
    (k) => k.toLowerCase() === subject.toLowerCase()
  );
  return key ? SUBJECT_BACKGROUNDS[key] : SUBJECT_BACKGROUNDS.Mathematics;
}

export function StudyRoomSidePanel({ subject, topic, className = "" }: StudyRoomSidePanelProps) {
  const meta = getSubjectMeta(subject);
  const bg = getSubjectBg(subject);
  const SubjectIcon = meta.icon;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 20, stiffness: 260 } },
  };

  return (
    <aside
      className={`w-80 border-l border-border/40 bg-background hidden xl:flex flex-col overflow-y-auto ${className}`}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-5 p-5 h-full"
      >
        {/* ─── Header: Premium Glassmorphic ─── */}
        <motion.div variants={item} className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-primary/5 via-primary/5 to-background border border-primary/10 shadow-lg shadow-primary/5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
              <SubjectIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
                Study Board
              </h2>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Collaborative Classroom
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                    {subject}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Current Focus ─── */}
        <motion.div variants={item} className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Current Focus
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/40 to-background border border-border/40 p-4">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: bg.pattern }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {subject}
                </span>
              </div>
              <p className="text-sm font-black leading-tight text-foreground">
                {topic || "General Study Session"}
              </p>
              {topic && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Bookmark className="h-3 w-3 text-violet-500" />
                  <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">
                    Active topic
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Key Concepts Quick Reference ─── */}
        <motion.div variants={item} className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Brain className="h-3.5 w-3.5 text-violet-500" />
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Key Concepts
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {meta.concepts.map((concept, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-secondary/30 border border-border/30 p-3 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${meta.color.split(" ")[0].replace("from-", "").replace("/20", "/5")} 0%, transparent 60%)`,
                  }}
                />
                <div className="relative z-10 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <span className="text-[9px] font-black text-primary">{i + 1}</span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                    {concept}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Mash AI Quick Summary ─── */}
        <motion.div variants={item} className="space-y-2.5 flex-1">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
              Mash AI Notes
            </p>
          </div>

          <div className="relative flex flex-col h-full min-h-[180px] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/[0.04] via-emerald-500/[0.02] to-background border border-emerald-500/10 p-4">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Quick Reference
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div className="rounded-xl bg-background/40 border border-border/20 p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                    Ask Mash AI in the chat for instant explanations, formulas, practice questions, or a topic summary.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-violet-500/5 border border-violet-500/10 p-3">
                  <PenTool className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-500 mb-0.5">
                      Collaborative Notes
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground leading-snug">
                      Type and edit notes together in real time — coming soon.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/15 p-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                    <Sparkles className="inline h-2.5 w-2.5 mr-1 -mt-0.5" />
                    Powered by Mash AI
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
