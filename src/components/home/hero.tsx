import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MessageCircle,
  Sparkles,
  Zap,
  Trophy,
  BookOpen,
  Users,
  CheckCircle,
  Video,
  Bell,
  ClipboardList,
} from "lucide-react";

// stats prop kept for API compatibility — no longer displayed in the hero
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HomeHero({ stats: _stats }: { stats?: { value: number; label: string }[] }) {
  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20 pb-0">
      {/* Background blobs — hidden on iOS (GPU compositing conflict) */}
      <div className="absolute inset-0 z-0 pointer-events-none ios-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl space-y-10 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Hero text */}
        <div className="space-y-6">
          <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tightest leading-[0.9] text-foreground">
            Education, <br />
            <span className="text-primary">reimagined.</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Your personal study base for school, revision, mentorship, and momentum. Mash AI, verified tutors, and real students help you move from stuck to ready.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button className="h-16 px-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95">
              Start Your Study Plan
            </Button>
          </Link>
          <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="h-16 px-10 rounded-full border-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-black text-xs tracking-widest uppercase transition-all flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              Join Student Updates
            </Button>
          </a>
        </div>

        {/* ── Dashboard Mockup ── */}
        <div className="relative w-full mx-auto mt-8 px-2 md:px-0">

          {/* Floating badge — top left: session booked */}
          <div className="absolute -top-8 -left-2 md:-left-6 z-20 hidden md:flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border rounded-2xl px-4 py-2.5 shadow-xl animate-float">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Video className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session booked</p>
              <p className="text-sm font-black">Dr. Wanjiku · Maths</p>
            </div>
          </div>

          {/* Floating badge — top right: challenge unlocked */}
          <div className="absolute -top-6 -right-2 md:-right-6 z-20 hidden md:flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border rounded-2xl px-4 py-2.5 shadow-xl animate-float-delayed">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Challenge unlocked</p>
              <p className="text-sm font-black">Day 7 streak 🔥</p>
            </div>
          </div>

          {/* Main mockup window */}
          <div className="relative rounded-[2rem] overflow-hidden border border-border/60 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] bg-background">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/60 border-b border-border/50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              <div className="flex-1 mx-4 h-5 rounded-full bg-background/80 flex items-center px-3">
                <span className="text-[10px] text-muted-foreground font-mono">edyfra.com/dashboard</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10">
                <Bell className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-black text-primary">3</span>
              </div>
            </div>

            {/* Dashboard interior */}
            <div className="grid grid-cols-12 min-h-[340px] md:min-h-[400px]">

              {/* Left sidebar */}
              <div className="col-span-2 hidden md:flex flex-col bg-background border-r border-border/50 p-4 gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mb-2">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                {[
                  { Icon: BookOpen, label: "Study" },
                  { Icon: Users, label: "Tutors" },
                  { Icon: ClipboardList, label: "Tasks" },
                  { Icon: Trophy, label: "Points" },
                ].map(({ Icon, label }, i) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-colors ${
                      i === 0 ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[8px] font-black">{label}</span>
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div className="col-span-12 md:col-span-7 p-5 space-y-4 bg-background">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monday · Form 4</p>
                    <h3 className="text-lg font-black tracking-tight">Good morning, Amina 👋</h3>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/20 transition-colors">
                    <Zap className="h-3 w-3" /> Find Tutor
                  </div>
                </div>

                {/* Today&apos;s plan */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3 w-3 text-primary" /> Today&apos;s Plan
                  </p>
                  {[
                    { label: "Chemistry · Organic Reactions", done: true },
                    { label: "Maths · Integration Practice", done: true },
                    { label: "English · Essay Outline", done: false },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-2.5">
                      <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${t.done ? "text-emerald-500" : "text-border"}`} />
                      <span className={`text-xs font-medium ${t.done ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                        {t.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mash AI Chat */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Mash AI
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-primary/10 text-primary text-xs font-medium rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%] text-left">
                      You&apos;ve mastered stoichiometry — want to move to organic reactions next?
                    </div>
                  </div>
                  <div className="flex gap-2 items-end justify-end">
                    <div className="bg-foreground text-background text-xs font-medium rounded-2xl rounded-br-sm px-3 py-2">
                      Yes, start with functional groups 📚
                    </div>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-black">A</div>
                  </div>
                  {/* Typing indicator */}
                  <div className="flex gap-2 items-end">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-primary/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel — session & stats */}
              <div className="col-span-3 hidden md:flex flex-col bg-muted/30 border-l border-border/50 p-4 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">This Week</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Sessions", value: "8", color: "bg-primary/10 text-primary" },
                    { label: "Points", value: "1,240", color: "bg-yellow-500/10 text-yellow-600" },
                    { label: "Streak", value: "7d 🔥", color: "bg-emerald-500/10 text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.color}`}>
                      <p className="text-lg font-black leading-none">{s.value}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-border/50 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Next Session</p>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Dr. Wanjiku</p>
                    <p className="text-xs font-bold mt-0.5 text-foreground">Algebra · 4:00 PM</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
