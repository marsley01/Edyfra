"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
         <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Your Privacy Matters</p>
            <h1 className="text-6xl font-black tracking-tightest">Privacy <span className="text-muted-foreground">Policy.</span></h1>
            <p className="text-xl text-muted-foreground font-medium">How we collect, use, and protect your personal data.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
            {[
              { icon: Lock, title: "Encryption", desc: "Your data is protected with enterprise-grade security." },
              { icon: Eye, title: "Transparency", desc: "You own your data — we just help you learn." },
              { icon: ShieldCheck, title: "Protection", desc: "We never share your info with third parties." },
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
                  What Data We Collect
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   We only collect the information we truly need to help you learn. Here's what that means:
                 </p>
                 <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                   <li>Your email and name — so we can create your account and verify you're a real student.</li>
                   <li>Your education level, subjects, and curriculum (8-4-4, CBC, IGCSE) — so we can match you with the right study content and peers.</li>
                   <li>Study session info — so we can improve our matching and recommend better study partners.</li>
                 </ul>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">02</span>
                  How We Use Your Data in Study Sessions
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   When you're in a study session, we process some data in real time to make things work smoothly:
                 </p>
                 <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                   <li>Mash AI steps in with academic help when your tutor is unavailable.</li>
                   <li>We can generate session summaries so you can review what you learned later.</li>
                   <li>We monitor interactions to keep things respectful and productive.</li>
                 </ul>
                 <p className="text-xs italic bg-secondary p-4 rounded-xl border border-border">
                   Good to know: You can delete your session history at any time from your dashboard settings.
                 </p>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">03</span>
                  Security & Infrastructure
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   We use top-tier providers like Supabase and Vercel to keep your data safe. Everything is encrypted, and we run regular security checks to make sure no one can access your data except you.
                 </p>
                 <p>
                   Every database table on Edyfra has Row Level Security (RLS) enabled — meaning your study history is only visible to you and your study partners.
                 </p>
               </div>
            </section>

            <section className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">04</span>
                  Our Promise to You
               </h2>
               <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
                 <p>
                   We do not sell your data — period. No ads, no third-party trackers, no data brokers. If we ever share anonymized data for education research, it's stripped of any personal info and used to help improve learning in Kenya.
                 </p>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
}
