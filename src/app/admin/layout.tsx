"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import {
  ChevronLeft, Menu, Activity, Globe, Users, LayoutDashboard, GraduationCap, ShieldCheck, FileText, BookMarked, Bell, Newspaper, Star, MessageSquare, Award, TrendingUp, Settings, Search, Terminal, LogOut, Cpu, Inbox, Bot, Building2, KeyRound
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AdminSidebarContentProps = {
  pathname: string;
  navItems: NavItem[];
  adminUser: User | null;
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
  onClose?: () => void;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Prevents premature redirect while the async auth check is in-flight.
  // Without this, any latency causes adminUser===null → immediate /dashboard redirect.
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) router.push("/login");
          return;
        }

        // Authoritative check: Prisma role (founder emails auto-promote).
        // Also syncs user_metadata so future requests are fast.
        try {
          const { checkAdminAccess } = await import("@/app/actions/admin-auth");
          const { allowed } = await checkAdminAccess();
          if (cancelled) return;
          if (allowed) {
            setAdminUser(user);
            return;
          }
        } catch (err) {
          console.error("[AdminLayout] checkAdminAccess failed:", err);
          // If the check itself throws (network error, cold start), do NOT
          // redirect — show an error state instead so admins aren't locked out.
          if (!cancelled) setAdminUser(null);
          return;
        }

        // Check definitively returned false — not an admin.
        if (!cancelled) router.push("/dashboard");
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, supabase]);

  const navItems: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/institutions", label: "Institutions", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/tutors", label: "Tutors", icon: GraduationCap },
    { href: "/admin/moderation", label: "Moderation", icon: ShieldCheck },
    { href: "/admin/resources", label: "Resources", icon: FileText },
    { href: "/admin/curriculum", label: "Curriculum", icon: BookMarked },
    { href: "/admin/announcements", label: "Announcements", icon: Bell },
    { href: "/admin/news", label: "Knowledge Feed", icon: Newspaper },
    { href: "/admin/testimonials", label: "Testimonials", icon: Star },
    { href: "/admin/feedback", label: "Tutor Feedback", icon: MessageSquare },
    { href: "/admin/feedback-inbox", label: "Feedback Inbox", icon: Inbox },
    { href: "/admin/ai-history", label: "AI History", icon: Bot },
    { href: "/admin/challenges", label: "AI Challenges", icon: Award },
    { href: "/admin/insights", label: "Insights", icon: TrendingUp },
    { href: "/admin/ai-settings", label: "AI Settings", icon: Cpu },
    { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  // While the async auth check is in-flight, show a minimal loading state.
  // This prevents the race condition where adminUser===null causes a flash redirect.
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/40 animate-pulse">
            <Terminal className="text-white h-6 w-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Verifying access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Minimal Status Strip */}
      <div className="h-7 bg-muted/30 border-b border-border/40 flex items-center justify-between px-4 text-[10px] font-medium text-muted-foreground z-[60] relative overflow-hidden">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-600 dark:text-emerald-400">Online</span>
          </div>
          <div className="flex items-center gap-1.5 hidden sm:flex flex-shrink-0">
            <Globe className="h-3 w-3" />
            <span>Kenya</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-foreground font-semibold">Edyfra Admin</span>
        </div>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden h-20 bg-background/40 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-8 z-40">
        <div className="flex items-center gap-3">
          {pathname !== "/admin" && (
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-slate-300" />
            </button>
          )}
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl">
              <svg className="text-white h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11l-9-7-9-7z"/>
                <path d="M21 16l-6-6 6 6v2l-6-6-6-6z"/>
              </svg>
            </div>
            <span className="text-xl font-black text-primary tracking-tighter">Edyfra Admin</span>
          </Link>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Open admin menu"
          aria-expanded={isMobileMenuOpen}
        >
          <Menu className="h-6 w-6 text-slate-300" />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
            />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                className="fixed inset-y-0 left-0 w-[88vw] max-w-72 bg-[#050505] z-[70] shadow-2xl overflow-y-auto custom-scrollbar"
              >
              <div className="absolute top-6 right-6 z-50">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  <Menu className="h-6 w-6 text-slate-300" />
                </button>
              </div>
              <AdminSidebarContent
                pathname={pathname}
                navItems={navItems}
                adminUser={adminUser}
                supabase={supabase}
                router={router}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1">
        {/* Sidebar (Desktop) */}
        <aside className="w-64 bg-background border-r border-border/40 hidden lg:flex flex-col fixed top-7 bottom-0 z-50">
          <AdminSidebarContent
            pathname={pathname}
            navItems={navItems}
            adminUser={adminUser}
            supabase={supabase}
            router={router}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 bg-background">
          <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border/40 hidden lg:flex items-center justify-between px-6 xl:px-8 sticky top-7 z-40">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search…"
                  className="bg-muted/50 border border-border/40 rounded-full py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all w-48 xl:w-64 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>
            </div>
          </header>

             <AnimatePresence mode="wait">
               <motion.div
                 key={pathname}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.3 }}
                 className="p-4 sm:p-6 lg:p-10"
               >
                 {children}
               </motion.div>
             </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function AdminSidebarContent({ pathname, navItems, adminUser, supabase, router, onClose }: AdminSidebarContentProps) {
  return (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-border/40 flex items-center gap-3">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Terminal className="text-white h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground tracking-tight block">Edyfra</span>
            <span className="text-[10px] font-medium text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-border/40">
        <div className="p-3 rounded-xl bg-muted/30 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
              {adminUser?.email?.[0].toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{adminUser?.email || "Founder"}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
