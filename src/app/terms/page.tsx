"use client";

import { motion } from "framer-motion";
import { FileText, Scale, UserCheck, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
         <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Our Rules</p>
            <h1 className="text-6xl font-black tracking-tightest text-foreground">Terms of <span className="text-muted-foreground">Service.</span></h1>
            <p className="text-xl text-muted-foreground font-medium">The rules that keep Edyfra safe, fair, and useful for every student.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
            {[
              { icon: Scale, title: "Fair Use", desc: "Respect other people's work and ideas." },
              { icon: UserCheck, title: "Be Real", desc: "Use your real name and info to build trust." },
              { icon: AlertTriangle, title: "Stay Honest", desc: "No cheating, no plagiarism — simple." },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-secondary rounded-2xl space-y-4">
                 <item.icon className="h-6 w-6 text-primary" />
                 <h3 className="font-black text-sm uppercase tracking-widest">{item.title}</h3>
                 <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
         </div>

         <div className="prose prose-invert max-w-none space-y-16">
            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">01</span>
                  Our Code of Conduct
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   Edyfra is built to help you learn. By using Edyfra, you agree to be a positive member of our community. That means:
                 </p>
                 <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                   <li>Be honest — don't use Edyfra to cheat on exams or plagiarize. It defeats the purpose.</li>
                   <li>Be respectful — no harassment, bullying, or inappropriate behaviour in study rooms.</li>
                   <li>Be yourself — use your real academic info so people know who they're studying with.</li>
                 </ul>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">02</span>
                  Your Responsibilities
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   Keep your account secure — don't share your password with anyone. You're responsible for anything that happens under your account.
                 </p>
                 <p>
                   We may suspend or remove accounts that spam, use bots, or repeatedly break the community rules. Let's keep Edyfra clean and useful for everyone.
                 </p>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">03</span>
                  Service Availability
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   We work hard to keep Edyfra up and running, but sometimes we need to take the platform offline briefly for maintenance or updates.
                 </p>
                 <p>
                   We can't be held responsible for missed deadlines due to downtime, so we recommend keeping backup copies of your important study materials. We'll try our best to let you know in advance when maintenance is coming.
                 </p>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">04</span>
                  Content Ownership
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   Edyfra's design, features, and technology belong to us. But your study notes, resources, and content you create are yours.
                 </p>
                 <p>
                   By using Edyfra, you give us permission to process your content to improve our AI and matching — that's how Mash AI gets smarter at helping you. You can delete your content at any time.
                 </p>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
}
