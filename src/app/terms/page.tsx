"use client";

import { motion } from "framer-motion";
import { FileText, Scale, UserCheck, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
        <div className="space-y-6">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Scholarly Standards</p>
           <h1 className="text-6xl font-black tracking-tightest text-foreground">Terms of <span className="text-muted-foreground">Service.</span></h1>
           <p className="text-xl text-muted-foreground font-medium">The foundation of our institutional ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
           {[
             { icon: Scale, title: "Fair Use", desc: "Respect intellectual property and peers." },
             { icon: UserCheck, title: "Verification", desc: "Authentic profiles only." },
             { icon: AlertTriangle, title: "Conduct", desc: "Zero tolerance for academic dishonesty." },
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
              <h2 className="text-2xl font-black tracking-tight">1. Institutional Integrity</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                By using Edyfra, you agree to maintain the highest standards of academic integrity. The platform is designed for legitimate knowledge synchronization, and any form of cheating or plagiarism is strictly prohibited.
              </p>
           </section>

           <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">2. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                You are responsible for maintaining the security of your institutional credentials. Edyfra reserves the right to suspend accounts that exhibit patterns of non-scholarly behavior.
              </p>
           </section>

           <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">3. Mission-Critical Availability</h2>
              <p className="text-muted-foreground leading-relaxed font-medium">
                While we strive for 99.9% synchronization uptime, service may be occasionally suspended for institutional upgrades.
              </p>
           </section>
        </div>
      </div>
    </div>
  );
}
