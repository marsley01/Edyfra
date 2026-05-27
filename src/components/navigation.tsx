"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features" },
  { name: "Community", href: "/community" },
  { name: "Roadmap", href: "/roadmap" },
  { name: "Institutions", href: "/institution" },
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
      if (window.scrollY > 20) {
        if (!scrolled) setScrolled(true);
      } else {
        if (scrolled) setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        setUser(supabaseUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  const showBackButton = pathname !== "/" && !isOpen;
  const isLinkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        scrolled ? "bg-background/80 backdrop-blur-md h-14 sm:h-16 border-border shadow-sm" : "h-16 sm:h-20"
      )}
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo — icon + text */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Edyfra Home">
          <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg group-hover:scale-105 transition-transform object-cover" />
          <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
            Edyfra
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isLinkActive(link.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium transition-colors relative group",
                isLinkActive(link.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.name}
              <span className={cn(
                "absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300",
                isLinkActive(link.href) ? "w-full" : "w-0 group-hover:w-full"
              )} />
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              <ThemeToggle />
              <Link href="/dashboard">
                <Button variant="ghost" className="rounded-full px-6 font-semibold">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="rounded-full px-6 font-semibold">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="rounded-full px-6 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-xl">
                  Get Started
                </Button>
              </Link>
            </>
          )}
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
            className="p-2 text-foreground rounded-xl hover:bg-primary/5 transition-colors"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

    </nav>

    {/* Mobile Menu Sidebar Drawer */}
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            className="absolute inset-y-0 right-0 w-80 bg-background p-8 flex flex-col border-l border-border shadow-2xl z-[110]"
          >
            <div className="flex items-center justify-between mb-12">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                <Image src="/image.png" alt="Edyfra Logo" width={40} height={40} className="w-10 h-10 rounded-xl shadow-lg object-cover" />
                <span className="text-2xl font-black tracking-tight text-foreground">
                  Edyfra
                </span>
              </Link>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-3 rounded-2xl hover:bg-secondary transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2 mb-10">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between py-4 px-6 rounded-2xl transition-all group",
                      isLinkActive(link.href) ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground hover:translate-x-1"
                    )}
                  >
                    <span className="text-xl font-bold tracking-tight">{link.name}</span>
                    <ChevronRight className={cn(
                      "h-5 w-5 transition-all opacity-0 group-hover:opacity-100",
                      isLinkActive(link.href) && "opacity-100"
                    )} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-8 border-t border-border">
              {user ? (
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block w-full">
                  <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-primary text-white hover:bg-primary/90 shadow-xl active:scale-[0.98] transition-all">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup" onClick={() => setIsOpen(false)} className="block w-full">
                    <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-foreground text-background hover:bg-foreground/90 shadow-xl active:scale-[0.98] transition-all">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full">
                    <Button variant="ghost" className="w-full h-14 rounded-2xl font-semibold text-lg hover:bg-secondary">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
