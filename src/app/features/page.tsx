"use client";

import { motion } from "framer-motion";
import {
  Zap, Shield, Users, Target,
  MessageSquare, BarChart3, Globe,
  Search, BookOpen, GraduationCap,
  Sparkles, Layers, ShieldCheck, Brain
} from "lucide-react";

const allFeatures = [
  { title: "Smart Matching", description: "We connect you with the right tutors and study partners based on what you're learning and how you like to study.", icon: Target },
  { title: "Knowledge Feed", description: "A space built just for students to ask questions, share notes, and learn from each other.", icon: MessageSquare },
  { title: "Progress Tracking", description: "See how far you've come with clear, simple dashboards that show your growth over time.", icon: BarChart3 },
  { title: "Verified Tutors", description: "Every tutor on Edyfra has been checked and approved so you know you're in good hands.", icon: ShieldCheck },
  { title: "Connect Anywhere", description: "Study with people across Kenya — no matter where you are.", icon: Globe },
  { title: "Study Resources", description: "Access helpful guides, notes, and materials curated by tutors and students.", icon: BookOpen },
  { title: "Live Study Rooms", description: "Jump into real-time study sessions with chat, AI help, and collaborative tools.", icon: Zap },
  { title: "Rewards & Badges", description: "Earn points as you study and unlock badges that celebrate your progress.", icon: Sparkles },
  { title: "Peer Matching", description: "Find study partners at your level — matched by subject, topic, and learning style.", icon: Users },
  { title: "Daily Challenges", description: "Keep your skills sharp with daily problems that build streaks and reward consistency.", icon: Brain },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="max-w-3xl space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">What you get</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
            Everything you need <br /><span className="text-muted-foreground">to learn better.</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">
            Simple tools that make studying easier, more fun, and actually something you look forward to.
          </p>
        </div>

        {/* Feature Grid */}
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

        {/* Branded Highlight — NO stock photos */}
        <div className="rounded-[3rem] bg-black p-8 md:p-24 relative overflow-hidden text-center space-y-12">
          <div className="absolute inset-0 bg-primary/5 blur-[120px]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-6xl font-black tracking-tightest text-white leading-none">
              Just you and your studies.
            </h2>
            <p className="text-white/60 font-medium text-lg">
              We kept it simple so you can focus on what matters — learning.
            </p>
          </div>
          {/* Branded stat grid instead of stock photo */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "30s", label: "Avg Match" },
              { value: "24/7", label: "Available" },
              { value: "0", label: "Hassle" },
              { value: "100%", label: "Yours" },
            ].map(s => (
              <div key={s.label} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                <p className="text-4xl font-black text-white">{s.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
