"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  LayoutDashboard, BookOpen, GraduationCap,
  Bell, Settings, LogOut, Zap, Flame, Trophy,
  Sparkles, Share2, UserSearch, Users, MessageSquare, LibraryBig
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";
import { getUserData } from "@/app/actions/user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
      "w-64 h-[calc(100vh-5rem)] sticky top-20 border-r border-border flex-col bg-background/50 backdrop-blur-xl hidden lg:flex",
      onClose && "flex h-full sticky top-0 border-r-0"
    )}>
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
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

        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-secondary border border-border">
          <Avatar className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20">
            <AvatarImage src={avatar || undefined} alt={displayName} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl bg-primary text-white font-black text-sm">
              {displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[11px] font-black truncate text-foreground uppercase tracking-tight">{displayName}</p>
            <button onClick={handleLogout} className="text-[9px] font-black text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors uppercase tracking-widest">
               <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
