"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
        <div className="space-y-6">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Institutional Security</p>
           <h1 className="text-6xl font-black tracking-tightest">Privacy <span className="text-muted-foreground">Protocol.</span></h1>
           <p className="text-xl text-muted-foreground font-medium">How we synchronize and protect your scholarly data.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
           {[
             { icon: Lock, title: "Encryption", desc: "End-to-end institutional grade security." },
             { icon: Eye, title: "Transparency", desc: "You own every byte of your knowledge." },
             { icon: ShieldCheck, title: "Protection", desc: "Zero-sharing policy with 3rd parties." },
           ].map((item, i) => (
             <div key={i} className="p-6 bg-secondary rounded-2xl space-y-4">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="font-black text-sm uppercase tracking-widest">{item.title}</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </div>

        <div className="prose prose-invert max-w-none space-y-12">
           <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">1. Data Collection</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                Edyfra collects minimal data required for mission-critical synchronization. This includes your institutional email, academic level, and subject preferences to ensure accurate peer-matching.
              </p>
           </section>

           <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">2. Scholarly Synchronization</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                Knowledge shared in the Research Labs (Study Rooms) is temporarily stored to provide AI-assisted insights and session summaries. Users can purge their lab history at any time.
              </p>
           </section>

           <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">3. Global Security Standards</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                We adhere to international data protection protocols to ensure your academic trajectory remains secure and private.
              </p>
           </section>
        </div>
      </div>
    </div>
  );
}
