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
import { showError, showSuccess, showUnknownError } from "@/lib/toast";

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
        showError({
          title: "Couldn't subscribe you",
          cause: data.error || "The signup didn't go through.",
          fix: "Double-check your email and try once more.",
        });
        return;
      }

      setSubscribed(true);
      setEmail("");
      showSuccess("You're on the list", {
        description: "We'll keep you posted with what we're building.",
      });
    } catch (err) {
      showUnknownError(err, "Couldn't subscribe you");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-card/80 border-t border-border">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative container-max pt-20 pb-10">
        {/* Newsletter card */}
        <div className="relative mb-20 overflow-hidden rounded-2xl border border-border bg-background p-8 sm:p-12">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3 w-3" />
                Stay in the loop
              </div>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tightest text-foreground">
                Keep your learning momentum close.
              </h3>
              <p className="text-muted-foreground font-medium text-base sm:text-lg">
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
                  className="h-12 rounded-xl px-5 border-border bg-secondary text-foreground placeholder:text-muted-foreground min-w-[280px] focus-visible:ring-primary/30"
                />
                <Button
                  type="submit"
                  disabled={subscribed || loading}
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  {subscribed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {fieldError && (
                <p className="text-xs text-destructive font-medium px-1">{fieldError}</p>
              )}
            </form>
          </div>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 mb-16">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Edyfra Home">
              <span className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl overflow-hidden shadow-lg ring-1 ring-border">
                <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="h-9 w-9 object-cover" />
              </span>
              <span className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                Edyfra
              </span>
            </Link>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs">
              Built in Nairobi for students, tutors, and institutions that want one calmer place to learn, teach, and track progress.
            </p>
            <div className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>Students, tutors, and schools</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="break-all">{CONTACT_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-muted-foreground hover:text-primary transition-colors p-2.5 bg-secondary hover:bg-primary/10 border border-border rounded-full"
                aria-label="Contact Edyfra via Email"
                title="Email Us"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <Link
                href={WHATSAPP_CHANNEL}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors p-2.5 bg-secondary hover:bg-primary/10 border border-border rounded-full"
                aria-label="Join Edyfra WhatsApp Channel"
                title="WhatsApp Channel"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link
                href="/institution"
                className="text-muted-foreground hover:text-primary transition-colors p-2.5 bg-secondary hover:bg-primary/10 border border-border rounded-full"
                aria-label="Visit the institutions page"
                title="For Institutions"
              >
                <Globe className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Link sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 group"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <span>&copy; {new Date().getFullYear()} Edyfra Platforms.</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>built by</span>
            <Link
              href="https://marsley-mash-site.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
            >
              Mash
            </Link>
          </p>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/institution" className="hover:text-foreground transition-colors">Institutions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
