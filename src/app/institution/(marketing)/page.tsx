import Link from "next/link";
import {
  BrainCircuit,
  BookOpen,
  Users,
  Shield,
  BarChart3,
  ArrowRight,
  Upload,
  Building2,
  CheckCircle,
  GraduationCap,
  Globe,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: BookOpen,
    title: "AI Knowledge Base",
    description:
      "Upload your curriculum, syllabi, and textbooks. Edyfra indexes them as ground-truth context so every AI tutoring session is aligned with your institution's academic standards.",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Tutoring",
    description:
      "24/7 AI tutors that know your specific curriculum. Students get personalized help in every subject, while you maintain full control over the learning material.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track student engagement, completion rates, and AI interaction metrics. Make data-driven decisions to improve learning outcomes across your institution.",
  },
  {
    icon: Users,
    title: "Roster Management",
    description:
      "Manage students, instructors, department heads, and admins in one place. Granular role-based access with tenant boundary isolation for security.",
  },
  {
    icon: Shield,
    title: "Secure & Scalable",
    description:
      "Multi-tenant architecture with strict data isolation. Each institution operates in its own secure environment with role-based access controls.",
  },
  {
    icon: Upload,
    title: "Academic Asset Manager",
    description:
      "Upload and manage academic resources, handbooks, and reference materials. All assets are organized and available for AI context retrieval.",
  },
];

const benefits = [
  {
    icon: GraduationCap,
    title: "Better Student Outcomes",
    description: "Students get 24/7 access to AI tutors that know your exact curriculum and syllabus.",
  },
  {
    icon: Globe,
    title: "Scalable Across Campuses",
    description: "Manage multiple campuses, departments, and thousands of students from a single dashboard.",
  },
  {
    icon: Sparkles,
    title: "Curriculum-Aligned AI",
    description: "Upload your teaching materials and our AI adapts to your specific academic content.",
  },
  {
    icon: Layers,
    title: "Multi-Tenant Architecture",
    description: "Every institution gets isolated data with role-based access controls and audit logging.",
  },
];

export default function InstitutionLanding() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3730A3] text-sm font-bold text-white">
              E
            </div>
            <span className="text-lg font-bold text-gray-900">Edyfra</span>
            <Badge variant="outline" className="ml-1 border-[#3730A3]/20 bg-[#3730A3]/5 text-[10px] text-[#3730A3]">
              Institutions
            </Badge>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/institution/login">
              <Button variant="outline" className="border-gray-200 text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="bg-[#3730A3] hover:bg-[#3730A3]/90 text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3730A3]/5 via-transparent to-transparent" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#3730A3]/[0.02] to-transparent" />
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 border-[#3730A3]/20 bg-[#3730A3]/5 px-4 py-1.5 text-xs font-medium text-[#3730A3]">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              For Schools, Colleges & Universities
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Empower Your Institution with{" "}
              <span className="text-[#3730A3]">AI-Powered Learning</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-500 sm:text-xl">
              Edyfra provides a complete AI tutoring platform built for institutions.
              Upload your curriculum, manage your roster, and give every student access to
              AI tutors that know your specific syllabus.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/institution/login">
                <Button size="lg" className="h-12 rounded-xl bg-[#3730A3] px-8 text-base hover:bg-[#3730A3]/90">
                  Sign In to Your Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="h-12 rounded-xl border-gray-200 px-8 text-base">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "50K+", label: "Active Students" },
              { value: "500+", label: "Partner Institutions" },
              { value: "1M+", label: "AI-Powered Sessions" },
              { value: "99.9%", label: "Platform Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-[#3730A3] sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything your institution needs
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From curriculum management to AI-powered tutoring — all in one platform.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-[#3730A3]/20 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3730A3]/10 text-[#3730A3]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Why institutions choose Edyfra
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Purpose-built for educational institutions that demand excellence.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-5 rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#3730A3]/10 text-[#3730A3]">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Get your institution up and running in minutes.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create Your Portal",
                description:
                  "Sign up your institution, set your branding, and configure your allowed email domains for registration.",
              },
              {
                step: "02",
                title: "Upload Curriculum",
                description:
                  "Upload your syllabi, textbooks, and academic materials. Edyfra indexes them into the AI knowledge base.",
              },
              {
                step: "03",
                title: "Invite & Monitor",
                description:
                  "Invite students and instructors. Track engagement, AI usage, and learning outcomes from your dashboard.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3730A3] text-2xl font-bold text-white shadow-lg shadow-[#3730A3]/20">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by leading institutions
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                quote: "Edyfra transformed how our students access tutoring. The AI knowledge base that indexes our curriculum is a game-changer.",
                author: "Dr. Jane Mwangi",
                role: "Dean of Academics",
                institution: "Kenyatta University",
              },
              {
                quote: "We've seen a 40% improvement in student engagement since deploying Edyfra. The analytics help us identify at-risk students early.",
                author: "Prof. James Ochieng",
                role: "Head of ICT",
                institution: "Strathmore University",
              },
              {
                quote: "The multi-tenant architecture gives each department its own space while keeping central oversight. Exactly what we needed.",
                author: "Sarah Wanjiku",
                role: "Director of E-Learning",
                institution: "Moi University",
              },
            ].map((testimonial) => (
              <div key={testimonial.author} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <div className="text-sm font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-xs text-gray-500">{testimonial.role} · {testimonial.institution}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#3730A3] to-[#4f46e5]">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your institution?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Join hundreds of institutions already using Edyfra to power their students&apos; learning journey.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/institution/login">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-white px-8 text-base text-[#3730A3] hover:bg-white/90"
              >
                Sign In to Your Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/30 px-8 text-base text-white hover:bg-white/10"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3730A3] text-xs font-bold text-white">
                E
              </div>
              <span className="text-sm font-medium text-gray-500">Edyfra &copy; 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-gray-400 hover:text-gray-600">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
