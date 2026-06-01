"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import {
  ChevronLeft, Menu, Activity, Globe, Users, LayoutDashboard, GraduationCap, ShieldCheck, FileText, BookMarked, Bell, Newspaper, Star, MessageSquare, Award, TrendingUp, Settings, Search, Terminal, LogOut, Cpu
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
  adminUser: User;
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
  onClose?: () => void;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/dashboard");
          return;
        }
        const { checkAdminStatus } = await import("@/app/actions/admin");
        const isAdmin = await checkAdminStatus();
        if (!isAdmin) {
          router.push("/dashboard");
          return;
        }
        setAdminUser(user);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [supabase, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminUser) return null;

  const navItems: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/tutors", label: "Tutor Management", icon: GraduationCap },
    { href: "/admin/moderation", label: "Content Moderation", icon: ShieldCheck },
    { href: "/admin/resources", label: "Resource Hub", icon: FileText },
    { href: "/admin/curriculum", label: "Curriculum Content", icon: BookMarked },
    { href: "/admin/announcements", label: "Announcements", icon: Bell },
    { href: "/admin/news", label: "Knowledge Feed", icon: Newspaper },
    { href: "/admin/testimonials", label: "Testimonials", icon: Star },
    { href: "/admin/feedback", label: "Tutor Feedback", icon: MessageSquare },
    { href: "/admin/challenges", label: "AI Challenges", icon: Award },
    { href: "/admin/insights", label: "Site Insights", icon: TrendingUp },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/ai-settings", label: "AI Settings", icon: Cpu },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Global OS Status Bar */}
      <div className="h-8 bg-background border-b border-border flex items-center justify-between px-4 text-[8px] font-black uppercase tracking-[0.3em] z-[60] relative overflow-hidden">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-500">Online</span>
          </div>
          <div className="flex items-center gap-2 text-white/40 hidden sm:flex flex-shrink-0">
            <Activity className="h-3 w-3" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2 text-white/40 hidden md:flex flex-shrink-0">
            <Globe className="h-3 w-3" />
            <span>Kenya</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/40 flex-shrink-0">
          <span className="hidden sm:inline">Secure</span>
          <span className="text-primary">Admin</span>
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
        {/* Sleek Glass Sidebar (Desktop) */}
        <aside className="w-72 bg-background/40 backdrop-blur-2xl border-r border-border hidden lg:flex flex-col fixed top-8 bottom-0 z-50">
          <AdminSidebarContent
            pathname={pathname}
            navItems={navItems}
            adminUser={adminUser}
            supabase={supabase}
            router={router}
          />
        </aside>

        {/* Futuristic Main Content */}
        <main className="flex-1 lg:ml-72 bg-gradient-to-br from-background to-secondary">
          <header className="h-20 bg-black/40 backdrop-blur-md border-b border-white/5 hidden lg:flex items-center justify-between px-6 xl:px-10 sticky top-8 z-40">
            <div className="flex items-center gap-4 xl:gap-8">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="truncate">East Africa</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                <Activity className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Running</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
             <input
                   placeholder="Execute command..."
                   className="bg-white/5 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[9px] sm:text-[10px] font-bold tracking-widest focus:outline-none focus:border-primary/50 transition-all w-32 sm:w-48 xl:w-64"
                 />
              </div>
              <ThemeToggle />
              <button className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Bell className="h-4 w-4 text-slate-300" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
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
      <div className="p-8 border-b border-white/5 flex items-center gap-4">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/40">
            <Terminal className="text-white h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-primary tracking-tighter block">Edyfra</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Admin Panel</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 mb-4">Operations</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "relative group flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.1)]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-primary rounded-full" />
              )}
              <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-primary" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-border bg-background/20 space-y-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center font-black border border-primary/10">
              {adminUser?.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{adminUser?.email || "Founder"}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Founder Access</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-destructive/10 hover:text-destructive text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
          >
            <LogOut className="h-3.5 w-3.5" /> Terminate Session
          </button>
        </div>
      </div>
    </>
  );
}
