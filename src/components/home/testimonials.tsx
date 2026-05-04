"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    quote: "Edyfra didn't just help me find a tutor; it helped me find a community of scholars who push me to be better every single day. The AI matching is terrifyingly accurate.",
    name: "Kennedy Mutua",
    school: "University of Nairobi",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kennedy",
  },
  {
    quote: "The interface is so clean it actually makes me want to study. It's the first time an education platform in Kenya feels like it was built for the modern student.",
    name: "Anita Chebet",
    school: "Strathmore University",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anita",
  },
  {
    quote: "Synchronizing with mentors through the Knowledge Desk has been a game-changer for my engineering projects. Mission-critical stuff.",
    name: "Brian Omondi",
    school: "JKUAT",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brian",
  },
];

export function HomeTestimonials() {
  return (
    <section className="py-32 md:py-48 bg-secondary/30 overflow-hidden">
      <div className="container-max space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Loved by scholars.</h2>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl mx-auto">
            Authentic feedback from students dominating their fields.
          </p>
        </div>

        <div className="flex overflow-x-auto gap-8 pb-12 px-4 scrollbar-hide snap-x snap-mandatory">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="min-w-[300px] md:min-w-[450px] snap-center bg-background p-10 rounded-[2.5rem] border border-border shadow-sm space-y-8 flex flex-col justify-between"
            >
               <p className="text-xl md:text-2xl font-medium leading-relaxed italic text-foreground/90">
                 "{t.quote}"
               </p>
               <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-border shadow-sm">
                     <AvatarImage src={t.avatar} />
                     <AvatarFallback>{t.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                     <h4 className="font-black text-sm tracking-tight">{t.name}</h4>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.school}</p>
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
