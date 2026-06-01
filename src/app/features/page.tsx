"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Zap,
  Users,
  Target,
  MessageSquare,
  BarChart3,
  Globe,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Brain,
  TrendingUp,
  Building2,
  Layers,
} from "lucide-react";

const allFeatures = [
  { title: "Smart Matching", description: "We connect you with the right tutors and study partners based on what you are learning and how you like to study.", icon: Target },
  { title: "Knowledge Feed", description: "A space built just for students to ask questions, share notes, and learn from each other.", icon: MessageSquare },
  { title: "Progress Tracking", description: "See how far you have come with clear, simple dashboards that show your growth over time.", icon: BarChart3 },
  { title: "Verified Tutors", description: "Every tutor on Edyfra has been checked and approved so you know you are in good hands.", icon: ShieldCheck },
  { title: "Institution Portals", description: "Schools can launch a dedicated Edyfra space for their learners, staff, and approved tutor networks.", icon: Building2 },
  { title: "Study Resources", description: "Access helpful guides, notes, and materials curated by tutors and students.", icon: BookOpen },
  { title: "Live Study Rooms", description: "Jump into real-time study sessions with chat, AI help, and collaborative tools.", icon: Zap },
  { title: "Rewards & Badges", description: "Earn points as you study and unlock badges that celebrate your progress.", icon: Sparkles },
  { title: "Peer Matching", description: "Find study partners at your level - matched by subject, topic, and learning style.", icon: Users },
  { title: "Roster Analytics", description: "Track how cohorts are engaging, where support is needed, and which subjects need more attention.", icon: Layers },
  { title: "Connect Anywhere", description: "Study with people across Kenya - no matter where you are.", icon: Globe },
  { title: "Daily Challenges", description: "Keep your skills sharp with daily problems that build streaks and reward consistency.", icon: Brain },
];

const audienceGroups = [
  {
    title: "Students",
    description: "Get matched, revise faster, join live rooms, and keep your progress visible every week.",
  },
  {
    title: "Tutors",
    description: "Support learners with verified profiles, structured sessions, and a clearer way to stay discoverable.",
  },
  {
    title: "Institutions",
    description: "Onboard school communities, manage private tutor access, and see how support is landing across cohorts.",
  },
];

export default function FeaturesPage() {
  const [stats, setStats] = useState<{ value: number; label: string }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } catch {
        // Show nothing if fail
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        <div className="max-w-3xl space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">What you get</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
            Everything you need <br /><span className="text-muted-foreground">to learn better.</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">
            One platform for students, tutors, and institutions that want learning support to feel organized, responsive, and human.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-8 bg-secondary/50 rounded-[2rem] border border-border/50 hover:bg-background hover:shadow-2xl hover:translate-y-[-4px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary border border-border group-hover:bg-primary group-hover:text-white transition-colors mb-8 shadow-sm">
                <feature.icon className="h-6 w-6" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {audienceGroups.map((group, i) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[2rem] border border-border/60 bg-background p-8 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">{group.title}</p>
              <h2 className="mt-4 text-2xl font-black tracking-tight">{group.title} stay in motion</h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">{group.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="rounded-[3rem] bg-foreground p-8 md:p-24 relative overflow-hidden text-center space-y-12">
          <div className="absolute inset-0 bg-primary/5 blur-[120px]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-6xl font-black tracking-tightest text-background leading-none">
              Learning works better when the whole system lines up.
            </h2>
            <p className="text-background/60 font-medium text-lg">
              Students get support, tutors stay visible, and institutions get a clearer picture of progress.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.length > 0 ? stats.map((s) => (
              <div key={s.label} className="p-6 rounded-2xl bg-background/5 border border-background/10 text-center space-y-2">
                <p className="text-4xl font-black text-background">{s.value > 0 ? s.value.toLocaleString() : "Growing Daily"}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-background/40">{s.label}</p>
              </div>
            )) : (
              <>
                <div className="p-6 rounded-2xl bg-background/5 border border-background/10 text-center space-y-2">
                  <TrendingUp className="h-8 w-8 mx-auto text-background/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-background/40">Growing Daily</p>
                </div>
                <div className="p-6 rounded-2xl bg-background/5 border border-background/10 text-center space-y-2">
                  <TrendingUp className="h-8 w-8 mx-auto text-background/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-background/40">Growing Daily</p>
                </div>
                <div className="p-6 rounded-2xl bg-background/5 border border-background/10 text-center space-y-2">
                  <TrendingUp className="h-8 w-8 mx-auto text-background/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-background/40">Growing Daily</p>
                </div>
                <div className="p-6 rounded-2xl bg-background/5 border border-background/10 text-center space-y-2">
                  <TrendingUp className="h-8 w-8 mx-auto text-background/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-background/40">Growing Daily</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
