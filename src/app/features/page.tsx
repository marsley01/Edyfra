"use client";

import { motion } from "framer-motion";
import { 
  Zap, Shield, Users, Target, 
  MessageSquare, BarChart3, Globe,
  Search, BookOpen, GraduationCap,
  Sparkles, Layers, ShieldCheck
} from "lucide-react";

const allFeatures = [
  {
    title: "AI Discovery Engine",
    description: "Our proprietary algorithms synchronize you with the ideal tutors and study peers based on your unique academic trajectory.",
    icon: Target,
  },
  {
    title: "Knowledge Desk",
    description: "A high-fidelity social feed designed specifically for academic collaboration and discovery.",
    icon: MessageSquare,
  },
  {
    title: "Mission Analytics",
    description: "Visualize your growth with institutional-grade dashboards that measure your potential across the network.",
    icon: BarChart3,
  },
  {
    title: "Expert Verification",
    description: "Every mentor is hand-audited through a rigorous institutional validation protocol.",
    icon: ShieldCheck,
  },
  {
    title: "Global Sync",
    description: "Connect with scholars from across Kenya and beyond, breaking down geographical learning barriers.",
    icon: Globe,
  },
  {
    title: "Resource Forge",
    description: "Access a curated library of learning protocols, guides, and mission-critical resources.",
    icon: BookOpen,
  },
  {
    title: "Live Synchronization",
    description: "Engage in high-definition study sessions with real-time collaborative tools.",
    icon: Zap,
  },
  {
    title: "Honors System",
    description: "Earn institutional points and unlock legendary badges as you dominate your field.",
    icon: Sparkles,
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="max-w-3xl space-y-6">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Capabilities</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
             Engineered for <br /> <span className="text-muted-foreground">Mastery.</span>
           </h1>
           <p className="text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">
             We built the tools. You define the trajectory. Edyfra is the operating system for the modern scholar.
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
                   <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                     {feature.description}
                   </p>
                </div>
             </motion.div>
           ))}
        </div>

        {/* Highlight Section */}
        <div className="rounded-[3rem] bg-black p-8 md:p-24 relative overflow-hidden text-center space-y-12">
           <div className="absolute inset-0 bg-primary/5 blur-[120px]" />
           <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest text-white leading-none">Zero Friction Learning.</h2>
              <p className="text-white/60 font-medium text-lg">
                We stripped away the legacy bloat to focus on what matters: your growth.
              </p>
           </div>
           <img 
             src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2672&auto=format&fit=crop" 
             alt="System Architecture" 
             className="relative z-10 w-full max-w-4xl mx-auto rounded-3xl border border-white/10 shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000"
           />
        </div>
      </div>
    </div>
  );
}
