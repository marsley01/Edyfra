"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Cpu,
  Globe,
  Rocket,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { BlobDecor } from "@/components/ui/blob-decor";
import dynamic from "next/dynamic";

const MilkyWave = dynamic(
  () => import("@/components/three/MilkyWave").then((m) => m.MilkyWave),
  { ssr: false }
);

const scholarJourney = [
  {
    step: "01",
    title: "Create Your Account",
    icon: ShieldCheck,
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
    desc: "Sign up as a student or tutor. Tell us your curriculum (8-4-4, CBC, or IGCSE) and the subjects you're studying.",
    milestones: ["Verify your email", "Set your education level", "Pick your subjects"]
  },
  {
    step: "02",
    title: "Get Matched",
    icon: Zap,
    gradient: "from-brand-orange to-coral",
    glow: "shadow-brand-orange/40",
    desc: "Use Match-Me to find the perfect study partner, or ask Mash AI for instant help when no one's available.",
    milestones: ["Real-time matching", "Subject-based pairing", "AI fallback support"]
  },
  {
    step: "03",
    title: "Study Together",
    icon: BookOpen,
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/30",
    desc: "Jump into a private study room. Chat, share resources, and solve problems together in real time.",
    milestones: ["Encrypted chat", "Collaborative workspace", "Tutor support on demand"]
  },
  {
    step: "04",
    title: "Grow & Earn",
    icon: Award,
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-primary/30",
    desc: "Earn points for every session, level up your profile, and climb the national leaderboard.",
    milestones: ["Earn points", "Leaderboard rankings", "Unlock achievements"]
  }
];

const roadmapItems = [
  {
    phase: "Alpha",
    title: "The Foundation",
    status: "Completed",
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-600",
    chip: "bg-emerald-500 text-white",
    progress: 100,
    desc: "Launched the core Edyfra platform with peer matching, study rooms, and secure authentication.",
  },
  {
    phase: "Beta",
    title: "AI & Growth",
    status: "In Progress",
    icon: Cpu,
    gradient: "from-brand-orange to-coral",
    chip: "bg-gradient-to-r from-brand-orange to-coral text-white animate-pulse",
    progress: 65,
    desc: "Rolling out advanced AI tutors, real-time subject tracking, and expanding to more Kenyan counties.",
  },
  {
    phase: "Gamma",
    title: "Kenya-Wide Reach",
    status: "Scheduled",
    icon: Globe,
    gradient: "from-cyan-500 to-blue-500",
    chip: "bg-secondary text-muted-foreground border border-border",
    progress: 10,
    desc: "Scaling to support 1M+ students across Kenya with mobile apps and offline-capable features.",
  }
];

export default function RoadmapPage() {
  return (
    <div className="relative bg-background pb-32 overflow-hidden">
      {/* Solid colorful blobs behind the hero */}
      <div className="relative">
        <BlobDecor variant="mixed" />
      </div>

      <div className="container-max relative">

          {/* Hero Header */}
         <div className="max-w-4xl space-y-6 mb-28 pt-16">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-[0.5em] text-primary"
              >
                 What&apos;s Coming Next
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.02]"
              >
                 Edyfra{" "}
                 <span className="bg-gradient-to-r from-brand-orange via-coral to-brand-orange bg-clip-text text-transparent">
                   Roadmap.
                 </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed"
              >
                 We're building the best study platform for Kenyan students. Here's what we've done and where we're headed.
              </motion.p>
           </div>

           {/* Section 1: How Edyfra Works */}
           <div className="space-y-12 mb-44">
             <motion.div
               initial={{ opacity: 0, y: 24 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, amount: 0.5 }}
               className="space-y-3"
             >
               <h2 className="text-4xl md:text-5xl font-black tracking-tight">How Edyfra <span className="text-primary">Works.</span></h2>
               <p className="text-muted-foreground font-medium text-lg">Four simple steps to start learning better.</p>
             </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {scholarJourney.map((item, i) => (
                 <motion.div
                   key={item.step}
                   initial={{ opacity: 0, y: 32, scale: 0.96 }}
                   whileInView={{ opacity: 1, y: 0, scale: 1 }}
                   viewport={{ once: true, amount: 0.3 }}
                   whileHover={{ y: -8 }}
                   transition={{ delay: i * 0.12, type: "spring", stiffness: 120, damping: 16 }}
                   className="group relative p-8 rounded-[2.5rem] bg-card border border-border space-y-6 shadow-sm hover:shadow-2xl hover:border-primary/30 transition-colors overflow-hidden"
                 >
                    {/* solid corner blob */}
                    <div className={`pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-gradient-to-br ${item.gradient} opacity-15 group-hover:opacity-25 group-hover:scale-125 transition-all duration-500`} />

                    <div className="flex items-center justify-between relative">
                       <div className={`p-3 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg ${item.glow} group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                          <item.icon className="h-5 w-5" />
                       </div>
                       <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors select-none">{item.step}</span>
                    </div>
                    <div className="space-y-3 relative">
                       <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                       <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="pt-4 border-t border-border space-y-2 relative">
                       {item.milestones.map((m, mi) => (
                         <motion.div
                           key={m}
                           initial={{ opacity: 0, x: -10 }}
                           whileInView={{ opacity: 1, x: 0 }}
                           viewport={{ once: true }}
                           transition={{ delay: i * 0.12 + 0.25 + mi * 0.08 }}
                           className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                         >
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${item.gradient}`} /> {m}
                         </motion.div>
                       ))}
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>

           <div className="h-px bg-border w-full mb-44" />

            {/* Section 2: Development Roadmap */}
          <div className="space-y-12 mb-24">
             <motion.div
               initial={{ opacity: 0, y: 24 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, amount: 0.5 }}
               className="space-y-3"
             >
               <h2 className="text-4xl md:text-5xl font-black tracking-tight">What's <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Next.</span></h2>
               <p className="text-muted-foreground font-medium text-lg">The features and improvements we're working on.</p>
             </motion.div>
          </div>

          <div className="relative space-y-20 md:space-y-36">
            {/* Center Line with animated fill */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" />
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
              className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[3px] origin-top bg-gradient-to-b from-emerald-500 via-brand-orange to-blue-500 md:-translate-x-1/2 rounded-full"
            />

            {roadmapItems.map((item, i) => (
              <motion.div
                key={item.phase}
                initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60, y: 16 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex flex-col md:flex-row items-start ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Connector Dot — pulsing for in-progress */}
                <div className="absolute left-8 md:left-1/2 top-2 w-4 h-4 rounded-full bg-background border-4 border-primary z-10 md:-translate-x-1/2">
                  {item.status === "In Progress" && (
                    <span className="absolute inset-[-6px] rounded-full border-2 border-brand-orange/50 animate-ping" />
                  )}
                </div>

                {/* Content Side */}
                <div className={`pl-20 md:pl-0 md:w-1/2 ${i % 2 === 0 ? 'md:pl-24' : 'md:pr-24'}`}>
                   <motion.div
                     whileHover={{ y: -6 }}
                     transition={{ type: "spring", stiffness: 200, damping: 18 }}
                     className="group relative p-10 rounded-[3rem] bg-card border border-border space-y-8 hover:border-primary/40 shadow-lg hover:shadow-2xl overflow-hidden transition-colors duration-300"
                   >
                      {/* solid corner blob */}
                      <div className={`pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-gradient-to-br ${item.gradient} opacity-15 group-hover:opacity-25 group-hover:scale-125 transition-all duration-500`} />

                      <div className="flex items-center justify-between relative">
                         <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300`}>
                            <item.icon className="h-6 w-6" />
                         </div>
                         <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.chip}`}>
                            {item.status}
                         </span>
                      </div>

                      <div className="space-y-4 relative">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.phase}</p>
                         <h2 className="text-3xl font-black tracking-tight">{item.title}</h2>
                         <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>

                         {/* progress bar */}
                         <div className="pt-2 space-y-2">
                           <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                             <span>progress</span>
                             <span>{item.progress}%</span>
                           </div>
                           <div className="h-2 rounded-full bg-secondary overflow-hidden">
                             <motion.div
                               initial={{ width: 0 }}
                               whileInView={{ width: `${item.progress}%` }}
                               viewport={{ once: true }}
                               transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                               className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`}
                             />
                           </div>
                         </div>
                      </div>
                   </motion.div>
                </div>

                {/* Empty Side (For Layout) */}
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>

          {/* CTA Footer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
            className="relative mt-44 p-12 sm:p-16 rounded-[4rem] bg-gradient-to-br from-brand-orange via-orange-500 to-coral text-white text-center space-y-8 shadow-2xl shadow-brand-orange/30 overflow-hidden"
          >
             {/* Milky wave galaxy sweeping behind the CTA */}
             <MilkyWave className="absolute inset-0 opacity-70" />
             <div className="absolute inset-0 bg-gradient-to-b from-deep-void/10 via-transparent to-deep-void/30 pointer-events-none" />

             {/* solid decorative shapes */}
             <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/15 [border-radius:63%_37%_54%_46%/55%_48%_52%_45%]" />
             <div className="pointer-events-none absolute -bottom-20 -right-14 h-64 w-64 rounded-full bg-yellow-400/25 [border-radius:38%_62%_44%_56%/60%_38%_62%_40%] rotate-12" />
             <div className="pointer-events-none absolute top-8 right-[20%] h-10 w-10 rounded-xl bg-white/20 rotate-12 hidden sm:block" />

             <h2 className="text-4xl md:text-6xl font-black tracking-tight relative drop-shadow-[0_2px_12px_rgba(15,5,39,0.45)]">Shape the future of <br /> learning with us.</h2>
             <p className="text-lg md:text-xl font-medium opacity-95 max-w-2xl mx-auto relative drop-shadow-[0_1px_8px_rgba(15,5,39,0.45)]">
                Edyfra is built for scholars, by scholars. Join our WhatsApp community to stay updated on these milestones.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <a href="https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P" target="_blank" rel="noopener noreferrer">
                   <button className="h-16 px-10 rounded-full bg-white text-brand-orange-dark font-black text-xs tracking-widest uppercase hover:bg-white/90 transition-all flex items-center gap-3 shadow-xl active:scale-95">
                      Join the Channel
                   </button>
                </a>
                <Link href="/signup">
                   <button className="h-16 px-10 rounded-full bg-deep-void/40 backdrop-blur-md border border-white/25 text-white font-black text-xs tracking-widest uppercase hover:bg-white/15 transition-all flex items-center gap-3 active:scale-95">
                      Start Your Journey <ArrowRight className="h-4 w-4" />
                   </button>
                </Link>
             </div>
          </motion.div>
        </div>
    </div>
  );
}
