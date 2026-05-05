"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const team: { name: string; role: string; image: string }[] = [
  { name: "Mash", role: "Visionary & Founder", image: "https://github.com/shadcn.png" }, // Using a default avatar placeholder for now
];

export default function AboutPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Mission */}
        <div className="max-w-4xl space-y-12">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Our Story</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-[0.9]">
             Learning is better <br /> <span className="text-muted-foreground">when it&apos;s together.</span>
           </h1>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-border">
              <p className="text-xl md:text-2xl font-medium leading-relaxed">
                We started Edyfra because we saw too many students struggling alone when they didn&apos;t have to. Everyone learns better with someone to talk to.
              </p>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                We&apos;re building a space where students and tutors can find each other easily, have real conversations, and actually enjoy the process of learning. No stress, no complicated setups — just you, your study partner, and a room to focus.
              </p>
           </div>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: "Built for you", desc: "Every feature is designed with real students in mind." },
             { title: "Simple by default", desc: "No complicated setup. Just open and start learning." },
             { title: "Better together", desc: "Powered by a growing community of students and tutors." },
           ].map((value: { title: string; desc: string }) => (
             <div key={value.title} className="p-12 bg-secondary rounded-[3rem] space-y-6">
                <h3 className="text-3xl font-black tracking-tight">{value.title}</h3>
                <p className="text-lg text-muted-foreground font-medium">{value.desc}</p>
             </div>
           ))}
        </div>

        {/* Team Grid */}
        <div className="space-y-16">
            <div className="text-center space-y-4">
               <h2 className="text-4xl md:text-6xl font-black tracking-tightest">The people behind Edyfra.</h2>
               <p className="text-muted-foreground text-lg font-medium">We&apos;re a small team with a big mission.</p>
            </div>
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-6 text-center group"
                >
                   <div className="aspect-square rounded-[3rem] overflow-hidden border border-border shadow-sm group-hover:shadow-2xl group-hover:translate-y-[-4px] transition-all duration-500">
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                   </div>
                   <div className="space-y-1">
                      <h4 className="font-black text-xl tracking-tight">{member.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">{member.role}</p>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
