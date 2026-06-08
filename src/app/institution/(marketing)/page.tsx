"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  GraduationCap,
  School,
  Bell,
  FileText,
  Users,
  ArrowRight,
  Upload,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Check,
  Building2,
  Activity,
  Database,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const howItWorks = [
  {
    icon: Upload,
    title: "Upload your results",
    description:
      "At the end of term, upload student results. Edyfra analyses every student automatically.",
  },
  {
    icon: Calendar,
    title: "Assign holiday coaching",
    description:
      "The system identifies struggling students and recommends which teachers to assign.",
  },
  {
    icon: BarChart3,
    title: "Track improvement",
    description:
      "Monitor attendance, session quality, and marks improvement from one clean dashboard.",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Student Performance Analytics",
    description:
      "Term-by-term marks, subject breakdowns, and trend lines for every student in your school.",
  },
  {
    icon: Calendar,
    title: "Holiday Coaching Assignment",
    description:
      "Auto-match struggling students to the right teachers and schedule coaching for the holiday.",
  },
  {
    icon: GraduationCap,
    title: "Teacher as Tutor System",
    description:
      "Your own teachers become the tutors. Sessions, attendance, and notes — all in one place.",
  },
  {
    icon: Users,
    title: "Attendance Tracking",
    description:
      "See who shows up, who missed, and how attendance correlates with academic improvement.",
  },
  {
    icon: FileText,
    title: "PDF Reports per Student",
    description:
      "Generate clean, branded PDF reports for every student at the click of a button.",
  },
  {
    icon: Bell,
    title: "Parent Notifications",
    description:
      "Send term results, attendance alerts, and coaching reminders straight to parents.",
  },
];

function HeroVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  const videoY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0.6, 1, 1, 0.6]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen max-h-[1000px] min-h-[650px] flex items-center justify-center overflow-hidden border-b border-white/10"
    >
      {/* ── Video Background ── */}
      <motion.div
        style={{ scale: videoScale, y: videoY }}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {!videoLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3730A3]/40 via-[#1e1b4b] to-black animate-pulse" />
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-[1500ms] ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/videos/institution-hero.webm" type="video/webm" />
        </video>
      </motion.div>

      {/* ── Gradient Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e1e] via-[#0f0e1e]/60 to-[#0f0e1e]/20 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f0e1e]/80 via-transparent to-[#0f0e1e]/40 z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#3730A3]/15 via-transparent to-transparent z-10" />

      {/* ── Subtle Grid Pattern ── */}
      <div
        className="absolute inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Floating Decorative Badges ── */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] right-[6%] z-20 hidden lg:flex items-center gap-3 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-xl bg-[#3730A3]/30 flex items-center justify-center">
          <Activity className="h-4 w-4 text-[#818cf8]" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Data Analysis</p>
          <p className="text-sm font-bold text-white">24/7 real-time</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="absolute bottom-[20%] left-[5%] z-20 hidden lg:flex items-center gap-3 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Database className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Student Records</p>
          <p className="text-sm font-bold text-white">Analysed by AI</p>
        </div>
      </motion.div>

      {/* ── Main Content Card ── */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 w-full max-w-4xl mx-auto px-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="backdrop-blur-lg bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 md:p-16 shadow-[0_0_80px_-20px_rgba(55,48,163,0.15)]"
        >
          <div className="space-y-8 text-center">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2"
            >
              <Cpu className="h-3.5 w-3.5 text-[#818cf8]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                AI-Powered Analytics
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-7xl font-black tracking-tight leading-[0.95] text-white"
            >
              Bring your school into the{" "}
              <span className="bg-gradient-to-r from-[#818cf8] via-[#6366f1] to-[#3730A3] bg-clip-text text-transparent">
                future of learning.
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              Edyfra analyses every student record through machine learning — identifying
              gaps, recommending coaches, and tracking improvement across your entire institution.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/institution/signup">
                <Button className="group h-14 px-10 rounded-xl bg-white text-slate-900 hover:bg-white/90 font-bold text-sm transition-all active:scale-95 shadow-2xl flex items-center gap-2">
                  Apply for Your School
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  className="h-14 px-10 rounded-xl border-white/20 text-white hover:bg-white/10 font-bold text-sm transition-all flex items-center gap-2"
                >
                  Book a Demo
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="flex items-center justify-center gap-3 pt-4"
            >
              <div className="flex -space-x-2">
                {["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-black/30 flex items-center justify-center text-[8px] text-white font-bold shadow-lg"
                    style={{ backgroundColor: c }}
                  >
                    {["A", "B", "C", "D", "E"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/70">
                <span className="font-bold text-white">500+</span> Kenyan institutions already onboard
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Bottom fade for section transition ── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent z-30 pointer-events-none" />
    </section>
  );
}

const plans = [
  {
    name: "Starter",
    price: "KES 5,000",
    cadence: "/month",
    description: "Up to 100 students",
    features: [
      "Results upload & analysis",
      "Basic attendance tracking",
      "PDF reports per student",
      "Email support",
    ],
    accent: "border-slate-200",
  },
  {
    name: "Growth",
    price: "KES 15,000",
    cadence: "/month",
    description: "Up to 500 students",
    features: [
      "Everything in Starter",
      "Holiday coaching assignments",
      "Parent SMS notifications",
      "Priority support",
    ],
    accent: "border-[#3730A3] ring-2 ring-[#3730A3]/20",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "KES 40,000",
    cadence: "/month",
    description: "Unlimited students",
    features: [
      "Everything in Growth",
      "Multi-campus dashboard",
      "Dedicated success manager",
      "Custom onboarding",
    ],
    accent: "border-slate-200",
  },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "All data stays private and secure",
    description: "Tenant-isolated storage with encrypted backups and role-based access.",
  },
  {
    icon: Smartphone,
    title: "Works on any device",
    description: "Including the basic smartphones your teachers and parents already use.",
  },
  {
    icon: Check,
    title: "Kenyan data protection compliant",
    description: "Built in line with the Kenya Data Protection Act, 2019.",
  },
];

export default function InstitutionLanding() {
  return (
    <div className="bg-white text-slate-900">
      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <HeroVideo />

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Three steps to get your school running on Edyfra.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div key={item.title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3730A3] text-2xl font-bold text-white shadow-lg shadow-[#3730A3]/20">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#3730A3]/10 text-[#3730A3]">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything your school needs
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              From results analysis to parent notifications — all in one platform.
            </p>
          </div>
          <div className="feature-grid mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-[#3730A3]/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3730A3]/10 text-[#3730A3]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Pricing built for Kenyan schools
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Pay monthly. No long-term lock-in. Cancel any time.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative flex flex-col rounded-3xl border bg-white p-6 sm:p-8 transition-all ${plan.accent} ${
                  plan.featured ? "shadow-xl shadow-[#3730A3]/10" : "shadow-sm"
                }`}
              >
                {plan.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3730A3] text-white">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Most popular
                  </Badge>
                )}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {plan.cadence}
                  </span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/institution/signup" className="mt-8">
                  <Button
                    className={`cta-btn w-full h-12 rounded-xl ${
                      plan.featured
                        ? "bg-[#3730A3] text-white hover:bg-[#3730A3]/90"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Apply Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust ───────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-5 border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-600"
            >
              <School className="mr-1.5 h-3.5 w-3.5" />
              Built for Kenyan schools
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Safe, simple, and built for the way Kenya learns.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {trust.map((item) => (
              <div
                key={item.title}
                className="card flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#3730A3] to-[#4f46e5]">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to bring Edyfra to your school?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Apply in under three minutes. We&apos;ll get back to you within one school day.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/institution/signup">
              <Button
                size="lg"
                className="cta-btn h-14 rounded-2xl bg-white px-10 text-base font-bold text-[#3730A3] hover:bg-white/90"
              >
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
