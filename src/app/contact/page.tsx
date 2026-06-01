"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const faqs = [
  {
    q: "How does Edyfra match me with a study partner?",
    a: "We look at your subject, level, and study preferences to find the best tutor or peer for you — in real time. Think of it as a smart study buddy finder."
  },
  {
    q: "Is Edyfra for high school students only?",
    a: "Nope! Edyfra works for both High School (Form 1 to 4) and University students. Content is separated so everyone learns at the right level."
  },
  {
    q: "How do I become a tutor on Edyfra?",
    a: "Just apply through the app! We'll review your academic background and credentials. Once approved, you can start earning by helping other students."
  },
  {
    q: "Can I use Edyfra without internet?",
    a: "You'll need an internet connection to use Edyfra since we match you with study partners and tutors in real time."
  }
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
         <div className="max-w-3xl space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Talk to Us</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
              We'd love to <br /> <span className="text-muted-foreground">hear from you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
              Got a question, feedback, or just want to say hi? Drop us a message and we'll get back to you as soon as possible.
            </p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            {/* Form Side */}
            <div className="space-y-12">
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-4">Full Name</label>
                        <Input placeholder="e.g. Brian Kimani" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-4">Email Address</label>
                        <Input placeholder="brian@example.com" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest ml-4">Subject</label>
                     <Input placeholder="What is this about?" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest ml-4">Your Message</label>
                     <Textarea placeholder="Tell us how we can help..." className="min-h-[200px] rounded-[2rem] px-6 py-4 border-border bg-secondary resize-none" />
                  </div>
               </div>
               <Button className="h-16 px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
                  Send Message
               </Button>
            </div>

            {/* Info Side */}
            <div className="space-y-16">
               <div className="space-y-8">
                  <h3 className="text-2xl font-black tracking-tight">How to Reach Us</h3>
                 <div className="space-y-6">
                    {[
                      { icon: Mail, label: "Email Us", value: "edyfraplatform@gmail.com" },
                      { icon: MessageSquare, label: "WhatsApp Community", value: "Join our WhatsApp" },
                      { icon: MapPin, label: "Based In", value: "Nairobi, Kenya" },
                    ].map((info) => (
                      <div key={info.label} className="flex items-center gap-6 p-6 bg-secondary rounded-[2rem] border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                         <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm border border-border group-hover:bg-primary group-hover:text-white transition-all">
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
                  <h3 className="text-2xl font-black tracking-tight">Frequently Asked Questions</h3>
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
