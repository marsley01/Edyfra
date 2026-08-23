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
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { MiniBlobs } from "@/components/ui/mini-blobs";
const MilkyWave = dynamic(() => import("@/components/three/MilkyWave").then(m => m.MilkyWave), { ssr: false });
const AbstractMeshBackground = dynamic(
  () => import("@/components/three/AbstractMeshBackground").then(m => m.AbstractMeshBackground),
  { ssr: false }
);

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
  return (
    <section className="relative h-screen max-h-[1000px] min-h-[650px] flex items-center justify-center overflow-hidden border-b border-white/10">
      {/* â”€â”€ Image Background â”€â”€ */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/image.png"
          alt="Institution platform background"
          fill
          className="object-cover opacity-80"
          priority
        />
      </div>
      <AbstractMeshBackground />

      {/* â”€â”€ Gradient Overlays â”€â”€ */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e1e] via-[#0f0e1e]/60 to-[#0f0e1e]/20 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f0e1e]/80 via-transparent to-[#0f0e1e]/40 z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 via-transparent to-transparent z-10" />

      {/* â”€â”€ Subtle Grid Pattern â”€â”€ */}
      <div
        className="absolute inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* â”€â”€ Floating Decorative Badges â”€â”€ */}
      <div className="absolute top-[10%] right-[6%] z-20 hidden lg:flex items-center gap-3 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl px-4 py-3 shadow-2xl animate-bounce">
        <div className="w-9 h-9 rounded-xl bg-primary/25 flex items-center justify-center">
          <Activity className="h-4 w-4 text-[#ffb340]" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Data Analysis</p>
          <p className="text-sm font-bold text-white">24/7 real-time</p>
        </div>
      </div>

      <div className="absolute bottom-[20%] left-[5%] z-20 hidden lg:flex items-center gap-3 bg-white/[0.03] backdrop-blur-lg border border-white/10 rounded-xl px-4 py-3 shadow-2xl animate-bounce delay-150">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Database className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Student Records</p>
          <p className="text-sm font-bold text-white">Analysed by AI</p>
        </div>
      </div>

      {/* â”€â”€ Main Content Card â”€â”€ */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-5">
        <div className="bg-deep-void/85 border border-white/10 rounded-2xl p-8 sm:p-12 md:p-16 shadow-[0_0_80px_-20px_rgba(55,48,163,0.15)] animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-8 text-center">

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-7xl font-black tracking-tight leading-[0.95] text-white">
              Bring your school into the{" "}
              <span className="bg-gradient-to-r from-brand-orange via-[#ffb340] to-coral bg-clip-text text-transparent">
                future of learning.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto leading-relaxed">
              Edyfra analyses every student record through machine learning — identifying
              gaps, recommending coaches, and tracking improvement across your entire institution.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/institution/apply">
                <Button className="group h-14 px-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm transition-all active:scale-95 shadow-2xl flex items-center gap-2">
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
            </div>

            {/* Trust indicator */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {["#FF9500", "#06b6d4", "#E8521B", "#10b981", "#f59e0b"].map((c, i) => (
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
                <span className="font-bold text-white">Growing number of</span> Kenyan institutions already onboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Bottom fade for section transition â”€â”€ */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
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
    accent: "border-border",
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
    accent: "border-primary ring-2 ring-primary/25",
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
    accent: "border-border",
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
    <div className="bg-background text-foreground">
      {/* â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <HeroVideo />

      {/* â”€â”€â”€ How it works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three steps to get your school running on Edyfra.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div key={item.title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-orange to-coral text-2xl font-bold text-white shadow-lg shadow-brand-orange/30">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your school needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From results analysis to parent notifications — all in one platform.
            </p>
          </div>
          <div className="feature-grid mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pricing built for Kenyan schools
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pay monthly. No long-term lock-in. Cancel any time.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative flex flex-col rounded-3xl border bg-card p-6 sm:p-8 transition-all ${plan.accent} ${
                  plan.featured ? "shadow-xl shadow-primary/15" : "shadow-sm"
                }`}
                >
                  <MiniBlobs palette={plan.featured ? 0 : 1} />
                {plan.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Most popular
                  </Badge>
                )}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {plan.cadence}
                  </span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/institution/apply" className="mt-8">
                  <Button
                    className={`cta-btn w-full h-12 rounded-xl ${
                      plan.featured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-foreground text-background hover:bg-foreground/90"
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

      {/* â”€â”€â”€ Trust â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-5 border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <School className="mr-1.5 h-3.5 w-3.5" />
              Built for Kenyan schools
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Safe, simple, and built for the way Kenya learns.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {trust.map((item) => (
              <div
                key={item.title}
                className="card flex flex-col items-start rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <MiniBlobs palette={2} />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Final CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-orange via-orange-500 to-coral">
        <MilkyWave className={"absolute inset-0 opacity-60"} />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to bring Edyfra to your school?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Apply in under three minutes. We&apos;ll get back to you within one school day.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/institution/apply">
              <Button
                size="lg"
                className="cta-btn h-14 rounded-2xl bg-white px-10 text-base font-bold text-brand-orange-dark hover:bg-white/90"
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





