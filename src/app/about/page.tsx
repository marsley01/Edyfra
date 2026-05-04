"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const team = [
  { name: "Dr. Mash", role: "Mission Lead", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mash" },
  { name: "Sarah Omondi", role: "Product Architecture", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
  { name: "Kennedy Mutua", role: "Ecosystem Operations", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kennedy" },
  { name: "Anita Chebet", role: "Growth Sync", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anita" },
];

export default function AboutPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Mission */}
        <div className="max-w-4xl space-y-12">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">The Mission</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-[0.9]">
             Synchronizing <br /> <span className="text-muted-foreground">Distributed Intelligence.</span>
           </h1>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-border">
              <p className="text-xl md:text-2xl font-medium leading-relaxed">
                We believe that every scholar in Africa deserves access to peak-performance learning environments, regardless of their location.
              </p>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Edyfra was founded to solve the fragmentation in our academic ecosystem. By building the mission-critical infrastructure for peer-to-peer and mentor-led learning, we are accelerating the trajectory of the modern student.
              </p>
           </div>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: "Institutional Focus", desc: "Every pixel is engineered for the serious scholar." },
             { title: "Zero Friction", desc: "Removing the legacy barriers to academic discovery." },
             { title: "Community Driven", desc: "Powered by the collective intelligence of thousands." },
           ].map((value) => (
             <div key={value.title} className="p-12 bg-secondary rounded-[3rem] space-y-6">
                <h3 className="text-3xl font-black tracking-tight">{value.title}</h3>
                <p className="text-lg text-muted-foreground font-medium">{value.desc}</p>
             </div>
           ))}
        </div>

        {/* Team Grid */}
        <div className="space-y-16">
           <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Institutional Team.</h2>
              <p className="text-muted-foreground text-lg font-medium">The minds building the future of distributed learning.</p>
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
