"use client";

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "0",
    description: "Ideal for individual scholars starting their trajectory.",
    features: [
      "AI Matching (Limited)",
      "Public Knowledge Desk",
      "Standard Analytics",
      "Community Chat",
    ],
    button: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "499",
    description: "For elite scholars demanding peak performance.",
    features: [
      "Priority AI Matching",
      "Private Study Rooms",
      "Advanced Growth Metrics",
      "Expert Q&A Access",
      "Ad-free Experience",
    ],
    button: "Go Pro Now",
    popular: true,
  },
  {
    name: "School",
    price: "Custom",
    description: "Complete ecosystem synchronization for institutions.",
    features: [
      "Unlimited Scholars",
      "Dedicated Admin Console",
      "Institutional Verification",
      "SLA Support",
      "API Integration",
    ],
    button: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Pricing Plans</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
             Scalable <br /> <span className="text-muted-foreground">Scholarship.</span>
           </h1>
           <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
             Choose the protocol that fits your academic ambitions. No hidden friction.
           </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {tiers.map((tier, i) => (
             <motion.div
               key={tier.name}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className={cn(
                 "relative p-10 rounded-[3rem] border transition-all flex flex-col justify-between space-y-12",
                 tier.popular 
                   ? "bg-foreground text-background border-foreground shadow-[0_40px_100px_-20px_rgba(0,113,227,0.3)] scale-105 z-10" 
                   : "bg-secondary border-border"
               )}
             >
                {tier.popular && (
                  <div className="absolute top-6 right-10">
                     <span className="px-4 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">Recommended</span>
                  </div>
                )}

                <div className="space-y-6">
                   <h3 className="text-2xl font-black tracking-tight">{tier.name}</h3>
                   <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tightest">KSH {tier.price}</span>
                      {tier.price !== "Custom" && <span className="text-sm font-bold opacity-60">/mo</span>}
                   </div>
                   <p className={cn("text-sm font-medium", tier.popular ? "text-background/60" : "text-muted-foreground")}>
                      {tier.description}
                   </p>
                </div>

                <div className="space-y-6">
                   <ul className="space-y-4">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm font-medium">
                           <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", tier.popular ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                              <Check className="h-3 w-3 stroke-[3]" />
                           </div>
                           {f}
                        </li>
                      ))}
                   </ul>
                   <Link href="/signup" className="block w-full">
                      <Button className={cn(
                        "w-full h-14 rounded-full font-black text-xs tracking-widest uppercase transition-all shadow-xl active:scale-95",
                        tier.popular ? "bg-primary hover:bg-primary/90 text-white" : "bg-foreground text-background"
                      )}>
                        {tier.button}
                      </Button>
                   </Link>
                </div>
             </motion.div>
           ))}
        </div>

        {/* Comparison Table Link */}
        <div className="text-center">
           <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase text-muted-foreground hover:text-primary gap-2">
              View full feature comparison <Info className="h-4 w-4" />
           </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
