"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  LayoutDashboard, BookOpen, GraduationCap,
  Settings, LogOut, Zap, Flame, Trophy,
  Sparkles, Share2, UserSearch, Users, MessageSquare, LibraryBig,
  ChevronsUpDown, Search, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getUserData } from "@/app/actions/user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/feed", label: "Community", icon: Share2 },
  { href: "/dashboard/groups", label: "Study Groups", icon: Users },
  { href: "/dashboard/search", label: "Study Partners", icon: UserSearch },
  { href: "/dashboard/study", label: "Start a Session", icon: Zap },
  { href: "/dashboard/sessions", label: "My Sessions", icon: BookOpen },
  { href: "/dashboard/resources", label: "Resources", icon: LibraryBig },
  { href: "/dashboard/tutors", label: "Find a Tutor", icon: GraduationCap },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/challenges", label: "Daily Quests", icon: Flame },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/achievements", label: "Achievements", icon: Sparkles },
];

export default function DashboardSidebar({ user, onClose }: { user: User; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [points, setPoints] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.user_metadata?.name || "Student");

  useEffect(() => {
    getUserData().then(data => {
      if (data) {
        setPoints(data.points);
        setAvatar(data.avatar);
        if (data.name) setDisplayName(data.name);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className={cn(
      "flex flex-col bg-background border-r border-border transition-all duration-200",
      onClose ? "h-full w-full" : "w-64 h-[calc(100vh-5rem)] sticky top-20 hidden lg:flex"
    )}>
      {/* Mobile Close Button (only if onClose provided) */}
      {onClose && (
        <div className="flex justify-end p-4 lg:hidden">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary/80 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Workspace Switcher */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-all cursor-pointer group active:scale-[0.98]">
          <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
          <div className="flex-1 min-w-0">
            <span className="text-xl font-black truncate tracking-tighter">Edyfra</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input 
            type="text" 
            placeholder="Find..." 
            className="w-full bg-secondary/30 hover:bg-secondary/50 border border-border/50 rounded-lg py-1.5 pl-9 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:bg-secondary/50 transition-all placeholder:text-muted-foreground/60"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4.5 px-1.5 rounded bg-background border border-border/50 text-[9px] font-bold text-muted-foreground/60 shadow-sm">F</kbd>
        </div>
      </div>

      {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-none">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
              pathname === href
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 transition-colors",
              pathname === href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            {label}
            {pathname === href && (
              <motion.div 
                layoutId="active-nav"
                className="absolute left-0 w-1 h-4 bg-primary rounded-r-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </nav>


      {/* User section */}
      <div className="p-4 border-t border-border/50 space-y-4">
        <div className="flex items-center justify-between px-2">
           <ThemeToggle />
           <NotificationBell />
           <Link
             href="/dashboard/settings"
             className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
           >
             <Settings className="h-5 w-5" />
           </Link>
        </div>
        
        <div className="px-2 space-y-2">
           <Badge variant="outline" className="w-full justify-center py-1 bg-secondary border-border text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              {user.user_metadata?.role || "STUDENT"}
           </Badge>
            {user.user_metadata?.role === "TUTOR" && (
              <Link href="/tutor" className="flex items-center gap-2 justify-center w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all">
                 <GraduationCap className="h-3 w-3" /> Tutor Dashboard
              </Link>
            )}

           <div className="flex items-center gap-2 justify-center w-full py-2.5 rounded-xl bg-yellow-500/10 text-yellow-600 text-[10px] font-black uppercase tracking-widest border border-yellow-500/20 shadow-sm">
              <Trophy className="h-3 w-3 fill-current" /> {points?.toLocaleString() || "0"} Points
           </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-secondary/50 border border-border/50">
          <Avatar className="w-8 h-8 rounded-lg shadow-sm">
            <AvatarImage src={avatar || undefined} alt={displayName} className="rounded-lg object-cover" />
            <AvatarFallback className="rounded-lg bg-primary text-white font-bold text-[10px]">
              {displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate text-foreground tracking-tight">{displayName}</p>
            <button onClick={handleLogout} className="text-[10px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
               <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
