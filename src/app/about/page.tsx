"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, BrainCircuit, HeartHandshake, Sparkles } from "lucide-react";
import { InitialAvatar } from "@/components/ui/InitialAvatar";

const principles = [
  {
    title: "Human-first learning",
    description:
      "Edyfra is built around real study relationships, not just content dumps. We want students to feel seen, supported, and confident asking for help.",
    icon: HeartHandshake,
  },
  {
    title: "Clear paths to progress",
    description:
      "From matching with tutors to joining study rooms and finding resources, every step is designed to reduce friction and help people move quickly.",
    icon: ArrowRight,
  },
  {
    title: "Smart tools with purpose",
    description:
      "We use AI to guide, recommend, and personalize. It should make learning simpler and more useful, never colder or more confusing.",
    icon: BrainCircuit,
  },
];

const highlights = [
  { label: "Built for", value: "Students, tutors, and study groups" },
  { label: "Focus", value: "Kenyan curriculum and university learning" },
  { label: "Experience", value: "Matching, sessions, resources, and challenges" },
];

const journey = [
  {
    step: "The problem",
    body:
      "Too many learners were stuck studying alone, waiting too long for answers, or bouncing between disconnected tools that never felt made for them.",
  },
  {
    step: "The idea",
    body:
      "Create one platform where students can find support fast, tutors can share their expertise, and both sides can meet in a focused, modern learning space.",
  },
  {
    step: "The mission",
    body:
      "Help more people learn with confidence by making quality support easier to access, easier to trust, and easier to enjoy every day.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-28">
        <section className="max-w-5xl space-y-12">
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">About Edyfra</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-[0.9]">
              Learning grows faster
              <br />
              <span className="text-muted-foreground">when the right people connect.</span>
            </h1>
          </div>

          <div className="grid gap-12 border-t border-border pt-12 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <p className="text-xl md:text-2xl font-medium leading-relaxed">
                Edyfra started with one simple belief: students should not have to struggle in silence.
                When someone has the right tutor, the right study partner, and the right environment,
                learning stops feeling lonely and starts feeling possible again.
              </p>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                We are building a practical education platform for East African learners that brings
                together tutoring, collaborative study rooms, trusted resources, and AI-powered
                support in one place. The goal is not just to help people pass. It is to help them
                understand, grow, and keep showing up.
              </p>
            </div>

            <div className="grid gap-4">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-[2rem] border border-border bg-secondary/40 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{item.label}</p>
                  <p className="mt-3 text-lg font-bold leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-3">
          {principles.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[2.5rem] bg-secondary p-10 space-y-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight">{principle.title}</h2>
                  <p className="text-lg font-medium leading-relaxed text-muted-foreground">
                    {principle.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[3rem] border border-border bg-card p-10 md:p-14 space-y-8">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Our Story</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest">Why Edyfra exists</h2>
            </div>

            <div className="space-y-6">
              {journey.map((item, index) => (
                <div key={item.step} className="grid gap-3 border-t border-border pt-6 md:grid-cols-[140px_1fr]">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    0{index + 1} {item.step}
                  </p>
                  <p className="text-lg font-medium leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[3rem] bg-foreground text-background p-10 md:p-14 space-y-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_40%)] pointer-events-none" />
            <div className="relative space-y-6">
              <InitialAvatar name="Mash" size={80} />
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Founder</p>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight text-background">Mash</h3>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-background/50">
                  Vision, product direction, and learner-first execution
                </p>
              </div>
              <p className="text-lg leading-relaxed text-background/75">
                Edyfra was built out of a real need — to make quality learning support easier to find,
                easier to trust, and easier to show up for every day, for students across Kenya.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[3rem] border border-border bg-gradient-to-br from-primary/10 via-secondary/50 to-background p-10 md:p-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">What We Are Building</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tightest">
                One home for smarter studying.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[2rem] bg-background/90 p-6 space-y-3 shadow-sm">
                <BookOpen className="h-6 w-6 text-primary" />
                <h3 className="font-black text-xl">Trusted resources</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Curriculum-aware materials that help learners revise with more structure.
                </p>
              </div>
              <div className="rounded-[2rem] bg-background/90 p-6 space-y-3 shadow-sm">
                <HeartHandshake className="h-6 w-6 text-primary" />
                <h3 className="font-black text-xl">Real connection</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Better matching between students, tutors, and study partners who can actually help.
                </p>
              </div>
              <div className="rounded-[2rem] bg-background/90 p-6 space-y-3 shadow-sm">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="font-black text-xl">Useful AI</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Challenges, guidance, and support that keep practice consistent and engaging.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
