"use client";

import Link from "next/link";
import { GraduationCap, Mail, Globe, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const footerLinks = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Pricing", href: "/pricing" },
      { name: "Community", href: "/community" },
      { name: "News", href: "/news" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Blog", href: "/blog" },
      { name: "Guides", href: "/guides" },
      { name: "API", href: "/api" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Cookies", href: "/cookies" },
      { name: "Security", href: "/security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-24 pb-12">
      <div className="container-max">
        {/* Newsletter Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-24">
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight">Stay in the loop.</h3>
            <p className="text-muted-foreground font-medium">Get the latest ecosystem updates directly to your inbox.</p>
          </div>
          <div className="flex w-full lg:w-auto gap-2">
            <Input 
              placeholder="Email address" 
              className="h-12 rounded-full px-6 border-border bg-secondary min-w-[300px] focus-visible:ring-primary"
            />
            <Button size="icon" className="h-12 w-12 rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
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
              {[Mail, Globe, MessageCircle].map((Icon, i) => (
                <Link 
                  key={i} 
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors p-2 bg-secondary rounded-full"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
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
            © 2025 Edyfra Platforms. All systems operational.
          </p>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
             <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
             <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
             <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full border border-border">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Systems Active</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
