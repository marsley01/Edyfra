"use client";

import { motion } from "framer-motion";
import { ChevronRight, Target, Users, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    title: "Smart Discovery",
    description: "Find your ideal peers, mentors, and mission-critical courses using our proprietary AI matching engine. Synchronize with the best in the ecosystem.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2671&auto=format&fit=crop",
    icon: Target,
    link: "/features/discovery",
  },
  {
    title: "Real-time Community",
    description: "Collaborate, chat, and share discoveries in a high-fidelity institutional feed. Connect with scholars who share your academic trajectory.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2670&auto=format&fit=crop",
    icon: Users,
    link: "/features/community",
  },
  {
    title: "Track Your Growth",
    description: "Visualize your academic potential with beautiful, high-performance analytics. Measure your progress across the entire Edyfra network.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop",
    icon: Zap,
    link: "/features/analytics",
  },
];

export function HomeFeatures() {
  return (
    <section className="py-32 md:py-48 space-y-32 md:space-y-48">
      <div className="container-max text-center space-y-6">
        <h2 className="text-4xl md:text-6xl font-black tracking-tightest leading-none">
          Built for the way students <br className="hidden md:block" /> actually learn.
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto">
          We stripped away the clutter to build the OS for the elite scholar.
        </p>
      </div>

      <div className="space-y-32 md:space-y-48">
        {features.map((feature, i) => (
          <div key={feature.title} className="container-max">
            <div className={cn(
              "flex flex-col gap-12 md:gap-24 items-center",
              i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
            )}>
              {/* Image Side */}
              <motion.div
                initial={{ opacity: 0, x: i % 2 === 1 ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:w-1/2"
              >
                <div className="aspect-[4/3] rounded-[2.5rem] bg-secondary border border-border overflow-hidden shadow-2xl relative group">
                   <img 
                     src={feature.image} 
                     alt={feature.title} 
                     className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
                </div>
              </motion.div>

              {/* Text Side */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:w-1/2 space-y-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary">
                  <feature.icon className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                   <h3 className="text-4xl md:text-5xl font-black tracking-tightest">{feature.title}</h3>
                   <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
                     {feature.description}
                   </p>
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

// Helper for classNames
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
