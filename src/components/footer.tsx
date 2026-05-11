"use client";

import Link from "next/link";
import { useState } from "react";
import { GraduationCap, Mail, Globe, MessageCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";

const footerLinks = [
  {
    title: "Ecosystem",
    links: [
      { name: "Features", href: "/features" },
      { name: "Community", href: "/community" },
      { name: "Roadmap", href: "/roadmap" },
      { name: "News Feed", href: "/news" },
      { name: "About Us", href: "/about" },
    ],
  },
  {
    title: "Learning",
    links: [
      { name: "Find Tutors", href: "/dashboard/tutors" },
      { name: "Study Match", href: "/dashboard/study" },
      { name: "My Sessions", href: "/dashboard/sessions" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Contact Us", href: "/contact" },
      { name: "WhatsApp Channel", href: WHATSAPP_CHANNEL },
      { name: "Institutional", href: "/contact" },
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
      toast.success("You are in — we will keep you posted.");
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
        {/* Newsletter Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-24">
          <div className="space-y-2">
            <h3 className="text-3xl font-black tracking-tightest">Stay in the loop.</h3>
            <p className="text-muted-foreground font-medium text-lg">Get the latest ecosystem updates directly to your inbox.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col w-full lg:w-auto gap-2">
            <div className="flex w-full gap-2">
              <Input 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldError(""); }}
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

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 mb-24">
          <div className="col-span-2 lg:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                < GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tightest text-foreground">EDYFRA</span>
            </Link>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[200px]">
              The all-in-one platform where students discover, connect, and grow.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary rounded-full">
                <Mail className="h-4 w-4" />
              </Link>
              <Link href={WHATSAPP_CHANNEL} target="_blank" className="text-muted-foreground hover:text-emerald-500 transition-colors p-2 bg-secondary rounded-full">
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary rounded-full">
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

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            © {new Date().getFullYear()} Edyfra Platforms. All systems operational.
          </p>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
             <Link href="/privacy" className="hover:text-primary transition-colors">Privacy & Cookies</Link>
             <Link href="/terms" className="hover:text-primary transition-colors">Terms & Security</Link>
             <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full border border-border">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-500">Systems Active</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
