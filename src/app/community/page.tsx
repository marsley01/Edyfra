"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Star, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";

const topScholars = [
  { name: "John Doe", school: "UoN", points: "12,450", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
  { name: "Jane Smith", school: "JKUAT", points: "11,820", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
  { name: "Kevin Kamau", school: "Strathmore", points: "10,950", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin" },
  { name: "Mary Atieno", school: "KU", points: "9,800", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mary" },
];

export default function CommunityPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
           <div className="max-w-3xl space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Global Network</p>
              <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
                Elite <br /> <span className="text-muted-foreground">Community.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-xl">
                Join 10,000+ scholars from 200+ institutions. Synchronize your learning with the best in the ecosystem.
              </p>
           </div>
           <Link href="/signup">
              <Button className="h-16 px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
                 Synchronize Now
              </Button>
           </Link>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: "Active Scholars", value: "12,400+", icon: Users },
             { label: "Elite Mentors", value: "500+", icon: ShieldCheck },
             { label: "Institutional Hubs", value: "200+", icon: Globe },
             { label: "Daily Sessions", value: "1,200+", icon: GraduationCap },
           ].map((stat) => (
             <div key={stat.label} className="p-8 bg-secondary/50 rounded-[2rem] border border-border/50 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary mx-auto shadow-sm border border-border">
                   <stat.icon className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-3xl font-black tracking-tightest">{stat.value}</p>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Success Stories */}
        <div className="space-y-16">
           <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Institutional Stories.</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { 
                  name: "Brian Omondi", 
                  story: "Found a mentor through Edyfra who helped me land an internship at Safaricom. The network here is unmatched.",
                  image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=2574&auto=format&fit=crop"
                },
                { 
                  name: "Grace Wambui", 
                  story: "The study groups in the Knowledge Desk saved my engineering finals. Distributed learning actually works.",
                  image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2576&auto=format&fit=crop"
                }
              ].map((story, i) => (
                <motion.div
                  key={story.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative h-[600px] rounded-[3rem] overflow-hidden border border-border shadow-2xl"
                >
                   <img src={story.image} alt={story.name} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                   <div className="absolute bottom-0 left-0 p-12 space-y-6 text-white">
                      <p className="text-2xl font-medium leading-relaxed italic">"{story.story}"</p>
                      <div>
                         <h4 className="text-xl font-black tracking-tight">{story.name}</h4>
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verified Scholar</p>
                      </div>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="p-8 md:p-16 bg-secondary rounded-[3rem] border border-border space-y-12">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <h2 className="text-4xl font-black tracking-tightest">Institutional Honors.</h2>
                 <p className="text-muted-foreground text-lg font-medium">Top scholars climbing the global leaderboard this month.</p>
              </div>
              <Link href="/leaderboard">
                 <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase text-primary hover:text-primary underline">View full leaderboard</Button>
              </Link>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topScholars.map((s, i) => (
                <div key={s.name} className="p-6 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:shadow-lg transition-all">
                   <div className="text-2xl font-black text-muted-foreground w-8">#{i+1}</div>
                   <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={s.avatar} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                   </Avatar>
                   <div>
                      <h4 className="font-black text-sm tracking-tight">{s.name}</h4>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.school}</span>
                         <div className="w-1 h-1 rounded-full bg-border" />
                         <span className="text-[9px] font-black text-primary uppercase">{s.points} PTS</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
