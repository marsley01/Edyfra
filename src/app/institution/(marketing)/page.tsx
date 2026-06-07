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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "For Schools — Edyfra",
  description:
    "Edyfra gives Kenyan institutions the tools to track student performance, assign holiday coaching, and connect teachers and students in one platform.",
};

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
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3730A3]/5 via-transparent to-transparent" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#3730A3]/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-6 border-[#3730A3]/20 bg-[#3730A3]/5 px-4 py-1.5 text-xs font-medium text-[#3730A3]"
            >
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              For Schools, Colleges & Universities
            </Badge>
            <h1 className="hero-title text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Bring your school into the{" "}
              <span className="text-[#3730A3]">future of learning.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl">
              Edyfra gives institutions the tools to track student performance, assign
              holiday coaching, and connect teachers and students in one platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/institution/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="cta-btn w-full sm:w-auto h-14 rounded-2xl bg-[#3730A3] px-8 text-base hover:bg-[#3730A3]/90"
                >
                  Apply for Your School
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="cta-btn w-full sm:w-auto h-14 rounded-2xl border-slate-200 px-8 text-base"
                >
                  Book a Demo
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              No login required to explore
            </p>
          </div>
        </div>
      </section>

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
