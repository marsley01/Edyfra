"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, Users, GraduationCap, 
  Settings, Award, MessageSquare, BarChart3, 
  ShieldCheck, LogOut, Bell, Search,
  Activity, Globe, Terminal
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    // Allow the register page to load without this check if needed, 
    // but usually layout covers child pages. 
    // If we are on /admin/register, we skip this.
    if (pathname === "/admin/register") {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Check metadata role
    if (user.user_metadata?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    setAdminUser(user);
    setLoading(false);
  };

  if (loading) return null;

  // Special case for registration gate - don't show sidebar
  if (pathname === "/admin/register") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Scholars", icon: Users },
    { href: "/admin/tutors", label: "Verifications", icon: ShieldCheck },
    { href: "/admin/content", label: "Challenge CMS", icon: Award },
    { href: "/admin/sessions", label: "Sessions", icon: MessageSquare },
    { href: "/admin/settings", label: "System Config", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#050505] text-white selection:bg-primary/30">
      {/* Sleek Glass Sidebar */}
      <aside className="w-72 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col fixed h-full z-50">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/40">
            <Terminal className="text-white h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-primary tracking-tighter block">EDYFRA</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Core OS v2.1</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 mb-4">Operations</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative group flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.1)]" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
           <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center font-black border border-primary/10">
                  {adminUser.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{adminUser.user_metadata?.full_name || "Marsley"}</p>
                  <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Admin</span>
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
      </aside>

      {/* Futuristic Main Content */}
      <main className="flex-1 ml-72 bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
        <header className="h-20 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-40">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                 <Globe className="h-3.5 w-3.5 text-primary" />
                 <span>Regional Cluster: East-Africa-1</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                 <Activity className="h-3.5 w-3.5 text-primary" />
                 <span>Uptime: 99.98%</span>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                 <input 
                   placeholder="Execute command..." 
                   className="bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] font-bold tracking-widest focus:outline-none focus:border-primary/50 transition-all w-64"
                 />
              </div>
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
            className="p-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
