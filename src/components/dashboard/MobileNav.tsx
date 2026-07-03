"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ChevronLeft,
  LayoutDashboard, Zap, BookOpen, Bell, MoreHorizontal, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "./Sidebar";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { NotificationBell, NotificationCountBadge } from "@/components/dashboard/NotificationBell";
import { cn } from "@/lib/utils";
import { useRegisterOverlay } from "@/lib/overlay-manager";

// The 5 bottom tabs — most-used pages
const BOTTOM_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/sessions", label: "Sessions", icon: BookOpen },
  { href: "/dashboard/study", label: "Study", icon: Zap, accent: true },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell, showCount: true },
  { href: "/dashboard/tutors", label: "Tutors", icon: GraduationCap },
];

// Page title map for the mobile header
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/sessions": "My Sessions",
  "/dashboard/study": "Start Session",
  "/dashboard/notifications": "Notifications",
  "/dashboard/tutors": "Find a Tutor",
  "/dashboard/challenges": "Daily Quests",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/achievements": "Achievements",
  "/dashboard/community": "Community",
  "/dashboard/groups": "Study Groups",
  "/dashboard/search": "Study Partners",
  "/dashboard/resources": "Resources",
  "/dashboard/messages": "Messages",
  "/dashboard/settings": "Settings",
  "/dashboard/feed": "Feed",
};

export default function MobileNav({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useRegisterOverlay({ id: "student-mobile-nav", edge: "bottom", size: 64, slot: "mobile-nav" });

  const showBackButton = pathname !== "/dashboard";
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      {/* ── Top Header ── */}
      <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border px-3 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton ? (
            <button
              onClick={() => router.back()}
              className="p-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link href="/dashboard" className="shrink-0">
              <Image src="/image.png" alt="Edyfra" width={32} height={32} className="w-8 h-8 rounded-xl shadow object-cover" priority />
            </Link>
          )}
          <span className="text-base font-black tracking-tight text-foreground truncate">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell variant="topbar" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="rounded-xl hover:bg-primary/5"
            aria-label="Open menu"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </header>

      {/* ── Slide Drawer (all nav items) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-[min(320px,85vw)] bg-background z-[110] shadow-2xl overflow-hidden"
            >
              {/* Glows */}
              <div className="absolute top-0 left-0 w-full h-80 bg-primary/10 blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-full h-80 bg-primary/5 blur-[120px] translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10 h-full">
                <DashboardSidebar user={user} onClose={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {BOTTOM_TABS.map(({ href, label, icon: Icon, accent, showCount }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group"
                aria-label={label}
              >
                {accent ? (
                  /* Floating accent CTA */
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90",
                    isActive
                      ? "bg-primary shadow-primary/30 scale-105"
                      : "bg-primary/90 hover:bg-primary"
                  )}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center gap-0.5">
                    <div className={cn(
                      "w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                      isActive ? "bg-primary/15" : "group-active:bg-secondary"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      {showCount && <div className="absolute top-0 right-0"><NotificationCountBadge /></div>}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold tracking-wide leading-none",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                  </div>
                )}
                {isActive && !accent && (
                  <motion.div
                    layoutId="student-tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
