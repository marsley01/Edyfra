"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Mail,
  Globe,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Building2,
  MapPin,
  Heart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";
const CONTACT_EMAIL = "edyfraplatform@gmail.com";

const footerLinks = [
  {
    title: "Explore",
    links: [
      { name: "Features", href: "/features" },
      { name: "Community", href: "/community" },
      { name: "Roadmap", href: "/roadmap" },
      { name: "News Feed", href: "/news" },
      { name: "About Us", href: "/about" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { name: "Create Account", href: "/signup" },
      { name: "Sign In", href: "/login" },
      { name: "Talk to Support", href: "/contact" },
    ],
  },
  {
    title: "Institutions",
    links: [
      { name: "Institution Overview", href: "/institution" },
      { name: "Institution Login", href: "/institution/login" },
      { name: "Book Onboarding", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Email Us", href: `mailto:${CONTACT_EMAIL}`, external: true },
      { name: "WhatsApp Channel", href: WHATSAPP_CHANNEL, external: true },
      { name: "Contact Page", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy & Cookies", href: "/privacy" },
      { name: "Terms & Security", href: "/terms" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!email.trim()) {
      setFieldError("Please enter your email address.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing_page" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubscribed(true);
      setEmail("");
      toast.success("You are in. We will keep you posted.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-secondary/30 dark:bg-zinc-950 text-foreground dark:text-white border-t border-border">
      {/* Decorative gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/15 dark:bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.03),transparent_50%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative container-max pt-24 pb-12">
        {/* Newsletter card */}
        <div className="relative mb-24 overflow-hidden rounded-[2.5rem] border border-border bg-card/80 dark:bg-white/[0.06] p-8 sm:p-12 shadow-xl backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 dark:bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-500/15 dark:bg-violet-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3 w-3" />
                Stay in the loop
              </div>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tightest text-foreground dark:text-white">
                Keep your learning momentum close.
              </h3>
              <p className="text-muted-foreground dark:text-white/60 font-medium text-base sm:text-lg">
                Product updates, tutor news, and institution rollout milestones in your inbox.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col w-full lg:w-auto gap-2">
              <div className="flex w-full gap-2">
                <Input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError("");
                  }}
                  placeholder="you@school.ac.ke"
                  type="email"
                  disabled={subscribed || loading}
                  className="h-14 rounded-2xl px-6 border-border bg-background dark:bg-black/40 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 min-w-[300px] focus-visible:ring-cyan-400/50 shadow-inner"
                />
                <Button
                  type="submit"
                  disabled={subscribed || loading}
                  size="icon"
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white hover:brightness-110 shrink-0 transition-all active:scale-95 shadow-[0_0_24px_rgba(6,182,212,0.35)]"
                >
                  {subscribed ? (
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  ) : loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <ArrowRight className="h-6 w-6 text-white" />
                  )}
                </Button>
              </div>
              {fieldError && (
                <p className="text-xs text-red-500 font-medium px-1">{fieldError}</p>
              )}
            </form>
          </div>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 mb-20">
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Edyfra Home">
              <span className="relative h-10 w-10 inline-flex items-center justify-center rounded-xl overflow-hidden ring-1 ring-border shadow-lg">
                <Image src="/image.png" alt="Edyfra Logo" width={40} height={40} className="h-10 w-10 object-cover" />
                <span className="absolute inset-0 bg-gradient-to-tr from-cyan-400/0 via-cyan-400/0 to-violet-500/30 group-hover:opacity-100 opacity-0 transition-opacity" />
              </span>
              <span className="text-xl font-black tracking-tight text-foreground dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">
                Edyfra
              </span>
            </Link>
            <p className="text-sm text-muted-foreground dark:text-white/60 font-medium leading-relaxed max-w-[320px]">
              Built in Nairobi for students, tutors, and institutions that want one calmer place to learn, teach, and track progress.
            </p>
            <div className="space-y-3 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-white/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                <span>Students, tutors, and schools</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                <span className="break-all">{CONTACT_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-muted-foreground dark:text-white/60 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors p-2.5 bg-secondary dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10 border border-border rounded-full"
                aria-label="Contact Edyfra via Email"
                title="Email Us"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <Link
                href={WHATSAPP_CHANNEL}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground dark:text-white/60 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors p-2.5 bg-secondary dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10 border border-border rounded-full"
                aria-label="Join Edyfra WhatsApp Channel"
                title="WhatsApp Channel"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link
                href="/institution"
                className="text-muted-foreground dark:text-white/60 hover:text-violet-500 dark:hover:text-violet-300 transition-colors p-2.5 bg-secondary dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10 border border-border rounded-full"
                aria-label="Visit the institutions page"
                title="For Institutions"
              >
                <Globe className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="text-sm font-medium text-muted-foreground dark:text-white/65 hover:text-foreground dark:hover:text-white transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="h-1 w-1 rounded-full bg-cyan-500 dark:bg-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            ))}
          </div>

        {/* Bottom bar — no AI/Systems text */}
        <div className="pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <span>© {new Date().getFullYear()} Edyfra Platforms.</span>
            <span className="hidden sm:inline">·</span>
            <span>Built with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>in Nairobi.</span>
          </p>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:text-white/50">
            <Link href="/privacy" className="hover:text-foreground dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground dark:hover:text-white transition-colors">Terms</Link>
            <Link href="/institution" className="hover:text-foreground dark:hover:text-white transition-colors">Institutions</Link>
          </div>
        </div>
        </div>
      </footer>
    );
  }
