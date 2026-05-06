"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, GraduationCap, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features" },
  { name: "Community", href: "/community" },
  { name: "Roadmap", href: "/roadmap" },
  { name: "News", href: "/news" },
  { name: "About", href: "/about" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
      });
    };
    
    // Add scroll event with passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Also check on initial mount in case page loads already scrolled
    requestAnimationFrame(() => {
      setScrolled(window.scrollY > 20);
    });
    
    // Prevent background scrolling when mobile menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const showBackButton = pathname !== "/" && !isOpen;

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        scrolled ? "bg-background/80 backdrop-blur-xl h-14 sm:h-16 border-border shadow-sm" : "h-16 sm:h-20"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
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
        <div className="flex lg:hidden items-center gap-2 sm:gap-4">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
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
            className="fixed inset-0 top-0 left-0 w-full bg-background z-[60] p-4 sm:p-6 flex flex-col lg:hidden overflow-y-auto overscroll-y-contain"
          >
            <div className="flex items-center justify-between mb-8 sm:mb-12">
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

            <div className="flex-1 space-y-3 sm:space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between text-xl sm:text-2xl font-black tracking-tight py-2 border-b border-border/50 group"
                >
                  {link.name}
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>

            <div className="pt-6 sm:pt-8 space-y-3 sm:space-y-4">
              <Link href="/signup" onClick={() => setIsOpen(false)} className="block w-full">
                <Button className="w-full h-12 sm:h-14 rounded-2xl font-bold text-base sm:text-lg bg-foreground text-background">
                  Get Started
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full">
                <Button variant="ghost" className="w-full h-12 sm:h-14 rounded-2xl font-semibold text-base sm:text-lg">
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
