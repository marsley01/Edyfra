"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard, BookOpen, GraduationCap,
  Bell, Settings, LogOut, Zap, Flame, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Academic Desk", icon: LayoutDashboard },
  { href: "/dashboard/study", label: "Knowledge Hub", icon: Zap },
  { href: "/dashboard/sessions", label: "Study Log", icon: BookOpen },
  { href: "/dashboard/tutors", label: "Scholars", icon: GraduationCap },
  { href: "/dashboard/challenges", label: "Daily Quest", icon: Flame },
  { href: "/dashboard/leaderboard", label: "Rankings", icon: Trophy },
];

export default function DashboardSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-64 h-screen sticky top-0 border-r border-primary/10 flex flex-col bg-card/50 backdrop-blur-md">
      {/* Logo */}
      <div className="p-6 border-b border-primary/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="text-white h-6 w-6" />
          </div>
          <span className="text-2xl font-black text-primary tracking-tighter">Edyfra</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
              pathname === href
                ? "bg-primary text-white shadow-md shadow-primary/10 scale-[1.02]"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-primary/5 space-y-2">
        <Link
          href="/dashboard/notifications"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Bell className="h-4 w-4" />
          Alerts
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        
        <div className="pt-4 pb-2 px-2">
           <Badge variant="outline" className="w-full justify-center py-1 bg-primary/5 border-primary/10 text-[10px] text-primary font-black uppercase tracking-widest">
              {user.user_metadata?.education_level?.replace("_", " ") || "STUDENT"}
           </Badge>
        </div>

        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black">
            {user.email?.[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate text-primary">{user.user_metadata?.full_name || "Scholar"}</p>
            <button onClick={handleLogout} className="text-[10px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
               <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
