"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const faqs = [
  {
    q: "How does the AI matching protocol work?",
    a: "Our tiered engine analyzes your subject interests, education level, and active sessions to find the highest-compatibility tutors and peers in real-time."
  },
  {
    q: "Is Edyfra available for high schools?",
    a: "Yes, Edyfra has dedicated ecosystems for High School and University levels, with content strictly isolated for academic integrity."
  },
  {
    q: "How do I apply as an expert mentor?",
    a: "Experts can apply via our specialized onboarding flow. Every applicant undergoes a rigorous audit of their credentials and institutional background."
  },
  {
    q: "Can I use Edyfra offline?",
    a: "Edyfra requires an active synchronization with our servers to provide real-time matching and community feed updates."
  }
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="max-w-3xl space-y-6">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Inquiry Channel</p>
           <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
             Connect with <br /> <span className="text-muted-foreground">the Mission.</span>
           </h1>
           <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
             Have a discovery to share or need technical synchronization? Our team is standing by to assist your academic trajectory.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
           {/* Form Side */}
           <div className="space-y-12">
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-4">Full Name</label>
                       <Input placeholder="Mash Scholar" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-4">Email Address</label>
                       <Input placeholder="mash@edyfra.com" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-4">Subject</label>
                    <Input placeholder="Institutional Partnership" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-4">Communication Details</label>
                    <Textarea placeholder="How can we help your growth?" className="min-h-[200px] rounded-[2rem] px-6 py-4 border-border bg-secondary resize-none" />
                 </div>
              </div>
              <Button className="h-16 px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
                 Initialize Communication
              </Button>
           </div>

           {/* Info Side */}
           <div className="space-y-16">
              <div className="space-y-8">
                 <h3 className="text-2xl font-black tracking-tight">Institutional Hubs</h3>
                 <div className="space-y-6">
                    {[
                      { icon: Mail, label: "Synchronize", value: "missions@edyfra.com" },
                      { icon: MessageSquare, label: "Ecosystem Support", value: "+254 700 000 000" },
                      { icon: MapPin, label: "HQ Operations", value: "Nairobi, Kenya" },
                    ].map((info) => (
                      <div key={info.label} className="flex items-center gap-6 p-6 bg-secondary rounded-[2rem] border border-border/50">
                         <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm border border-border">
                            <info.icon className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{info.label}</p>
                            <p className="text-lg font-bold">{info.value}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-8">
                 <h3 className="text-2xl font-black tracking-tight">Mission Protocols (FAQ)</h3>
                 <div className="space-y-4">
                    {faqs.map((faq, i) => (
                      <div key={i} className="border-b border-border">
                         <button 
                           onClick={() => setOpenFaq(openFaq === i ? null : i)}
                           className="w-full py-6 flex items-center justify-between text-left group"
                         >
                            <span className="text-lg font-bold group-hover:text-primary transition-colors">{faq.q}</span>
                            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", openFaq === i ? "rotate-180" : "")} />
                         </button>
                         <AnimatePresence>
                            {openFaq === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                 <p className="pb-8 text-muted-foreground font-medium leading-relaxed">
                                    {faq.a}
                                 </p>
                              </motion.div>
                            )}
                         </AnimatePresence>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
