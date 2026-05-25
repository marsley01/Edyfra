"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, GraduationCap, 
  Settings, LogOut, Zap, Calendar, Wallet, Trophy,
  Menu, X, ChevronLeft, BookOpen, Bell
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUserData } from "@/app/actions/user";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const checkTutor = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Use Prisma as the source of truth for role, with Supabase metadata fallback
      const dbUser = await getUserData();
      const role = dbUser?.role || (user.user_metadata?.role || "").toUpperCase();

      if (role !== "TUTOR" && role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }

      if (role === "TUTOR" && !dbUser?.tutorProfile?.isVerified) {
        router.push("/dashboard");
        return;
      }

      setUser(user);
      if (dbUser) setPoints(dbUser.points);

    } catch (error) {
      console.error("Tutor auth check failed:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    checkTutor();
  }, [checkTutor]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { href: "/tutor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tutor/notifications", label: "Notifications", icon: Bell },
    { href: "/tutor/settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] bg-background font-sans overflow-x-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden h-20 bg-card border-b border-border px-4 flex items-center justify-between sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-secondary hover:bg-primary/5 transition-all"
            aria-label="Open tutor menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          {pathname !== "/tutor" && (
            <button
              onClick={() => router.back()}
              className="p-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Link href="/tutor" className="flex items-center gap-2">
            <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
            <span className="text-xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
        </div>
      </header>

      {/* Mobile Sidebar Overlay - Full Screen */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 w-full h-full bg-card z-[70] shadow-2xl overflow-y-auto overscroll-y-contain lg:hidden"
            >
              <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-card">
                <Link href="/tutor" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
                  <span className="text-xl font-black text-foreground tracking-tighter">Edyfra</span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                    aria-label="Student Dashboard"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </Link>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-secondary hover:bg-secondary/80"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <TutorSidebarContent 
                user={user} 
                pathname={pathname} 
                points={points} 
                navItems={navItems} 
                supabase={supabase}
                router={router}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Premium Desktop Sidebar */}
      <aside className="w-72 bg-card border-r border-border hidden lg:flex flex-col fixed h-full z-50">
        <TutorSidebarContent 
          user={user} 
          pathname={pathname} 
          points={points} 
          navItems={navItems} 
          supabase={supabase}
          router={router}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-6 lg:p-16">
        <div className="max-w-6xl mx-auto">
           {children}
        </div>
      </main>
    </div>
  );
}

function TutorSidebarContent({ 
  user, pathname, points, navItems, supabase, router, onClose 
}: any) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-8 border-b border-border/50">
        <Link href="/tutor" onClick={onClose} className="flex items-center gap-3 group">
          <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
          <div className="flex flex-col">
             <span className="text-2xl font-black text-foreground tracking-tighter leading-none">Edyfra</span>
             <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Teacher Dashboard</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className={cn(
          "grid gap-1.5",
          onClose ? "grid-cols-2" : "grid-cols-1"
        )}>
          {navItems.map((item: any) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl font-black uppercase tracking-widest transition-all duration-300",
                onClose 
                  ? "flex-col px-3 py-4 text-[9px] justify-center"
                  : "px-5 py-4 text-[11px]",
                pathname === item.href
                  ? "bg-primary text-white shadow-xl shadow-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon className={cn(onClose ? "h-5 w-5" : "h-4 w-4")} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-6 border-t border-border/50 space-y-6 bg-secondary/20">
        <div className="flex items-center justify-between px-2">
           <ThemeToggle />
           <div className="flex items-center gap-1">
             <NotificationBell />
             <button 
                onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                className="p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
             >
                <LogOut className="h-5 w-5" />
             </button>
           </div>
        </div>
        
        <div className="p-4 rounded-[1.5rem] bg-card border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20">
            {user?.email?.[0].toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate text-foreground uppercase tracking-tight">{user?.user_metadata?.name || "Tutor"}</p>
            <Badge className="bg-primary/10 text-primary border-none text-[8px] h-4 font-black uppercase tracking-widest mt-1">Verified Expert</Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-center w-full py-2.5 rounded-xl bg-yellow-500/10 text-yellow-600 text-[10px] font-black uppercase tracking-widest border border-yellow-500/20 shadow-sm">
             <Trophy className="h-3 w-3 fill-current" /> {points?.toLocaleString() || "0"} Points
          </div>
        </div>
      </div>
    </div>
  );
}
