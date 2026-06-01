"use client";

import { motion } from "framer-motion";
import { ChevronRight, Library, BookOpen, GraduationCap, CheckCircle2, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const FeatureVisuals = [
  <div key="discovery" className="w-full h-full bg-gradient-to-br from-primary/5 to-background flex flex-col items-center justify-center gap-6 p-8">
    <div className="w-full max-w-xs space-y-3">
      <div className="h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center px-5 gap-3">
        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 h-2 rounded-full bg-primary/20" />
      </div>
      {["Revision Notes", "Past Papers", "Study Guides"].map((r, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className="h-14 rounded-2xl bg-secondary border border-border flex items-center px-5 gap-4"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground/70">{r}</span>
          <div className="ml-auto w-2 h-2 rounded-full bg-primary/30" />
        </motion.div>
      ))}
    </div>
  </div>,

  <div key="community" className="w-full h-full bg-gradient-to-br from-blue-500/5 to-background flex flex-col gap-4 p-8 justify-center">
    {[
      { name: "University Expert", role: "Mentor" },
      { name: "High School Pro", role: "Peer" },
      { name: "Mash AI", role: "Intelligence" }
    ].map((p, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
        className="p-4 rounded-2xl border border-border bg-secondary/50 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-black text-[11px] flex-shrink-0 text-primary">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">{p.role}</p>
          <p className="text-sm font-bold mt-0.5 text-foreground">{p.name}</p>
        </div>
      </motion.div>
    ))}
  </div>,

  <div key="analytics" className="w-full h-full bg-gradient-to-br from-emerald-500/5 to-background flex flex-col gap-6 p-8 justify-center">
    {[
      { label: "School Adoption", pct: 82, color: "bg-primary" },
      { label: "Tutor Coverage", pct: 65, color: "bg-blue-500" },
      { label: "Learner Progress", pct: 91, color: "bg-emerald-500" },
    ].map((s, i) => (
      <div key={s.label} className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-muted-foreground">{s.label}</span>
          <span className="text-foreground">{s.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} whileInView={{ width: `${s.pct}%` }} transition={{ duration: 1, delay: i * 0.1 }}
            className={`h-full rounded-full ${s.color}`} />
        </div>
      </div>
    ))}
  </div>,
];

const features = [
  {
    title: "Resource Library",
    description: "Find past papers, notes, and study guides that match what you are learning instead of digging through random files.",
    icon: Library,
    link: "/features",
    visualIndex: 0,
  },
  {
    title: "Verified Mentors",
    description: "Ask for help from tutors and high-performing peers who understand the Kenyan classroom and the pressure before exams.",
    icon: GraduationCap,
    link: "/dashboard/tutors",
    visualIndex: 1,
  },
  {
    title: "Institution Hubs",
    description: "Schools can onboard cohorts, manage private tutor rosters, and follow student engagement without leaving the same Edyfra ecosystem.",
    icon: Building2,
    link: "/institution",
    visualIndex: 2,
  },
];

export function HomeFeatures() {
  return (
    <section className="py-32 md:py-48 space-y-32 md:space-y-48 font-sans">
      <div className="container-max text-center space-y-6">
        <h2 className="text-4xl md:text-6xl font-black tracking-tightest leading-none">
          Built for the way students, tutors, <br className="hidden md:block" /> and institutions actually grow.
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto">
          Every section is built around a simple question: what do you need next to keep learning moving?
        </p>
      </div>

      <div className="space-y-32 md:space-y-48">
        {features.map((feature, i) => (
          <div key={feature.title} className="container-max">
            <div className={cn("flex flex-col gap-12 md:gap-24 items-center", i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row")}>
              <motion.div
                initial={{ opacity: 0, x: i % 2 === 1 ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:w-1/2"
              >
                <div className="aspect-[4/3] rounded-[2.5rem] bg-secondary border border-border overflow-hidden shadow-2xl relative">
                  {FeatureVisuals[feature.visualIndex]}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:w-1/2 space-y-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-sm border border-border">
                  <feature.icon className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl md:text-5xl font-black tracking-tightest">{feature.title}</h3>
                  <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
                </div>
                <Link href={feature.link} className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] group">
                  Learn more <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
