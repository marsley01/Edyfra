"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Mail, Globe, MessageCircle, ArrowRight, CheckCircle2, Loader2, Building2, MapPin } from "lucide-react";
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
    <footer className="bg-background border-t border-border pt-24 pb-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container-max">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-24">
          <div className="space-y-2">
            <h3 className="text-3xl font-black tracking-tightest">Keep your learning momentum close.</h3>
            <p className="text-muted-foreground font-medium text-lg">Get product updates, tutor news, and institution rollout milestones in your inbox.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col w-full lg:w-auto gap-2">
            <div className="flex w-full gap-2">
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldError("");
                }}
                placeholder="Enter your email address"
                type="email"
                disabled={subscribed || loading}
                className="h-14 rounded-2xl px-6 border-border bg-secondary min-w-[300px] focus-visible:ring-primary shadow-sm"
              />
              <Button
                type="submit"
                disabled={subscribed || loading}
                size="icon"
                className="h-14 w-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 shrink-0 transition-all active:scale-95"
              >
                {subscribed ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
              </Button>
            </div>
            {fieldError && (
              <p className="text-xs text-red-500 font-medium px-1">{fieldError}</p>
            )}
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 mb-24">
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Edyfra Home">
              <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg object-cover" />
              <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                Edyfra
              </span>
            </Link>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[320px]">
              Built in Nairobi for students, tutors, and institutions that want one calmer place to learn, teach, and track progress.
            </p>
            <div className="space-y-3 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Students, tutors, and schools</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>{CONTACT_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`mailto:${CONTACT_EMAIL}`} className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary rounded-full" aria-label="Contact Edyfra via Email" title="Email Us">
                <Mail className="h-4 w-4" />
              </Link>
              <Link href={WHATSAPP_CHANNEL} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-emerald-500 transition-colors p-2 bg-secondary rounded-full" aria-label="Join Edyfra WhatsApp Channel" title="WhatsApp Channel">
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link href="/institution" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary rounded-full" aria-label="Visit the institutions page" title="For Institutions">
                <Globe className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>


      </div>
    </footer>
  );
}
