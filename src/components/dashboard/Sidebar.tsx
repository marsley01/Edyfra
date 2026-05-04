"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  LayoutDashboard, BookOpen, GraduationCap,
  Bell, Settings, LogOut, Zap, Flame, Trophy,
  Sparkles, Share2, Search, UserSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Academic Desk", icon: LayoutDashboard },
  { href: "/dashboard/feed", label: "Knowledge Desk", icon: Share2 },
  { href: "/dashboard/search", label: "Find Me", icon: UserSearch },
  { href: "/dashboard/study", label: "Study Desk", icon: Zap },
  { href: "/dashboard/sessions", label: "Study Log", icon: BookOpen },
  { href: "/dashboard/tutors", label: "Scholars", icon: GraduationCap },
  { href: "/dashboard/challenges", label: "Daily Quest", icon: Flame },
  { href: "/dashboard/leaderboard", label: "Rankings", icon: Trophy },
  { href: "/dashboard/achievements", label: "Honors", icon: Sparkles },
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
    <aside className="w-64 h-[calc(100vh-5rem)] sticky top-20 border-r border-border flex flex-col bg-background/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="p-8 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <GraduationCap className="text-white h-6 w-6" />
          </div>
          <span className="text-2xl font-black text-foreground tracking-tighter">Edyfra</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200",
              pathname === href
                ? "bg-primary text-white shadow-xl shadow-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border/50 space-y-4">
        <div className="flex items-center justify-between px-2">
           <ThemeToggle />
           <Link
             href="/dashboard/notifications"
             className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
           >
             <Bell className="h-5 w-5" />
           </Link>
           <Link
             href="/dashboard/settings"
             className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
           >
             <Settings className="h-5 w-5" />
           </Link>
        </div>
        
        <div className="px-2">
           <Badge variant="outline" className="w-full justify-center py-1 bg-secondary border-border text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              {user.user_metadata?.education_level?.replace("_", " ") || "STUDENT"}
           </Badge>
        </div>

        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-secondary border border-border">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">
            {user.email?.[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black truncate text-foreground uppercase tracking-tight">{user.user_metadata?.full_name || "Scholar"}</p>
            <button onClick={handleLogout} className="text-[9px] font-black text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors uppercase tracking-widest">
               <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
