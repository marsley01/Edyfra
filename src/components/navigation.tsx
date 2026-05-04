"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, GraduationCap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features" },
  { name: "Community", href: "/community" },
  { name: "News", href: "/news" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        scrolled ? "bg-background/80 backdrop-blur-xl h-16 border-border shadow-sm" : "h-20"
      )}
    >
      <div className="container-max h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-tightest">EDYFRA</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors relative group",
                pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.name}
              <span className={cn(
                "absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300",
                pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
              )} />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" className="rounded-full px-6 font-semibold">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="rounded-full px-6 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-xl">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex lg:hidden items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-foreground"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-0 left-0 w-full h-screen bg-background z-[60] p-6 flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between mb-12">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-xl font-black tracking-tightest">EDYFRA</span>
              </Link>
              <button onClick={() => setIsOpen(false)} className="p-2">
                <X />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between text-2xl font-black tracking-tight py-2 border-b border-border/50 group"
                >
                  {link.name}
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>

            <div className="pt-8 space-y-4">
              <Link href="/signup" onClick={() => setIsOpen(false)} className="block w-full">
                <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-foreground text-background">
                  Get Started
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full">
                <Button variant="ghost" className="w-full h-14 rounded-2xl font-semibold text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
