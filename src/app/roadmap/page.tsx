"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { 
  Zap, 
  Cpu, 
  Globe, 
  Rocket, 
  ShieldCheck, 
  Users,
  Award,
  BookOpen,
  ArrowRight
} from "lucide-react";

const scholarJourney = [
  {
    step: "01",
    title: "Create Your Account",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    desc: "Sign up as a student or tutor. Tell us your curriculum (8-4-4, CBC, or IGCSE) and the subjects you're studying.",
    milestones: ["Verify your email", "Set your education level", "Pick your subjects"]
  },
  {
    step: "02",
    title: "Get Matched",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    desc: "Use Match-Me to find the perfect study partner, or ask Mash AI for instant help when no one's available.",
    milestones: ["Real-time matching", "Subject-based pairing", "AI fallback support"]
  },
  {
    step: "03",
    title: "Study Together",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    desc: "Jump into a private study room. Chat, share resources, and solve problems together in real time.",
    milestones: ["Encrypted chat", "Collaborative workspace", "Tutor support on demand"]
  },
  {
    step: "04",
    title: "Grow & Earn",
    icon: Award,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
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
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    desc: "Launched the core Edyfra platform with peer matching, study rooms, and secure authentication.",
  },
  {
    phase: "Beta",
    title: "AI & Growth",
    status: "In Progress",
    icon: Cpu,
    color: "text-primary",
    bg: "bg-primary/10",
    desc: "Rolling out advanced AI tutors, real-time subject tracking, and expanding to more Kenyan counties.",
  },
  {
    phase: "Gamma",
    title: "Kenya-Wide Reach",
    status: "Scheduled",
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    desc: "Scaling to support 1M+ students across Kenya with mobile apps and offline-capable features.",
  }
];

export default function RoadmapPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-48">
        <div className="container-max">
          {/* Hero Header */}
         <div className="max-w-4xl space-y-8 mb-32">
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-[0.5em] text-primary"
              >
                 What's Coming Next
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-7xl md:text-8xl font-black tracking-tightest leading-none"
              >
                 Edyfra <span className="text-muted-foreground">Roadmap.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl leading-relaxed"
              >
                 We're building the best study platform for Kenyan students. Here's what we've done and where we're headed.
              </motion.p>
           </div>

           {/* Section 1: How Edyfra Works */}
           <div className="space-y-16 mb-48">
             <div className="space-y-4">
               <h2 className="text-4xl md:text-5xl font-black tracking-tightest">How Edyfra <span className="text-primary">Works.</span></h2>
               <p className="text-muted-foreground font-medium text-lg">Four simple steps to start learning better.</p>
             </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {scholarJourney.map((item, i) => (
                 <motion.div
                   key={item.step}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className="p-8 rounded-[2.5rem] bg-secondary/50 border border-border space-y-6 group hover:bg-background transition-all"
                 >
                    <div className="flex items-center justify-between">
                       <div className={`p-3 rounded-xl ${item.bg}`}>
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                       </div>
                       <span className="text-2xl font-black text-muted-foreground/20">{item.step}</span>
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                       <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="pt-4 border-t border-border space-y-2">
                       {item.milestones.map(m => (
                         <div key={m} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="w-1 h-1 rounded-full bg-primary" /> {m}
                         </div>
                       ))}
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>

          <div className="h-px bg-border w-full mb-48" />

           {/* Section 2: Development Roadmap */}
          <div className="space-y-16 mb-32">
             <div className="space-y-4">
               <h2 className="text-4xl md:text-5xl font-black tracking-tightest">What's <span className="text-muted-foreground">Next.</span></h2>
               <p className="text-muted-foreground font-medium text-lg">The features and improvements we're working on.</p>
             </div>
          </div>

          <div className="relative space-y-24 md:space-y-48">
            {/* Center Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2 opacity-50" />

            {roadmapItems.map((item, i) => (
              <motion.div 
                key={item.phase}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex flex-col md:flex-row items-start ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Connector Dot */}
                <div className="absolute left-8 md:left-1/2 top-0 w-4 h-4 rounded-full bg-background border-4 border-primary z-10 md:-translate-x-1/2" />

                {/* Content Side */}
                <div className={`pl-20 md:pl-0 md:w-1/2 ${i % 2 === 0 ? 'md:pl-24' : 'md:pr-24'}`}>
                   <div className="p-10 rounded-[3rem] bg-secondary/50 border border-border backdrop-blur-xl space-y-8 group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                      <div className="flex items-center justify-between">
                         <div className={`p-4 rounded-2xl ${item.bg} group-hover:scale-110 transition-transform`}>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                         </div>
                         <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>
                            {item.status}
                         </span>
                      </div>

                      <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.phase}</p>
                         <h2 className="text-3xl font-black tracking-tight">{item.title}</h2>
                         <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                      </div>
                   </div>
                </div>

                {/* Empty Side (For Layout) */}
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>

          {/* CTA Footer */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-48 p-16 rounded-[4rem] bg-gradient-to-br from-primary to-primary/60 text-white text-center space-y-8 shadow-2xl shadow-primary/20"
          >
             <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Shape the future of <br /> learning with us.</h2>
             <p className="text-lg md:text-xl font-medium opacity-90 max-w-2xl mx-auto">
                Edyfra is built for scholars, by scholars. Join our WhatsApp community to stay updated on these milestones.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P" target="_blank" rel="noopener noreferrer">
                   <button className="h-16 px-10 rounded-full bg-white text-primary font-black text-xs tracking-widest uppercase hover:bg-white/90 transition-all flex items-center gap-3 shadow-xl">
                      Join the Channel
                   </button>
                </a>
                <Link href="/signup">
                   <button className="h-16 px-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white font-black text-xs tracking-widest uppercase hover:bg-white/10 transition-all flex items-center gap-3">
                      Start Your Journey <ArrowRight className="h-4 w-4" />
                   </button>
                </Link>
             </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
