"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  LogOut,
  Trophy,
  LibraryBig,
  Bell,
  Share2,
  GraduationCap,
  CalendarCheck,
  Inbox,
  Wallet,
  ChevronsUpDown,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getUserData } from "@/app/actions/user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell, NotificationCountBadge } from "@/components/dashboard/NotificationBell";

const navItems = [
  { href: "/tutor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor/sessions", label: "My Sessions", icon: BookOpen },
  { href: "/tutor/schedule", label: "Schedule", icon: CalendarCheck },
  { href: "/tutor/requests", label: "Requests", icon: Inbox },
  { href: "/tutor/earnings", label: "Earnings", icon: Wallet },
  { href: "/tutor/resources", label: "Resources", icon: LibraryBig },
  { href: "/tutor/community", label: "Community", icon: Share2 },
  { href: "/tutor/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/tutor/notifications", label: "Notifications", icon: Bell, showCount: true },
  { href: "/tutor/settings", label: "Settings", icon: Settings },
];

export function TutorSidebar({ user, onClose }: { user: User; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [points, setPoints] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.user_metadata?.name || "Tutor");

  useEffect(() => {
    getUserData().then((data) => {
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
    <aside
      className={cn(
        "flex flex-col bg-background border-r border-border transition-all duration-200",
        onClose ? "h-full w-full" : "w-64 h-[calc(100vh-5rem)] sticky top-20 hidden lg:flex",
      )}
    >
      {onClose && (
        <div className="flex justify-end p-4 lg:hidden">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary/80 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Brand row */}
      <div className="px-4 py-3 border-b border-border/50">
        <Link
          href="/tutor"
          onClick={onClose}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <span className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl overflow-hidden ring-1 ring-border shadow-lg">
            <Image
              src="/image.png"
              alt="Edyfra Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-cover"
              priority
            />
            <span className="absolute inset-0 bg-gradient-to-tr from-cyan-400/0 via-cyan-400/0 to-violet-500/30 group-hover:opacity-100 opacity-0 transition-opacity" />
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-xl font-black truncate tracking-tighter">Edyfra</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </Link>
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
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4.5 px-1.5 rounded bg-background border border-border/50 text-[9px] font-bold text-muted-foreground/60 shadow-sm">
            F
          </kbd>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-none">
        {navItems.map(({ href, label, icon: Icon, showCount }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="truncate">{label}</span>
              {showCount && <NotificationCountBadge />}
              {isActive && (
                <motion.div
                  layoutId="active-tutor-nav"
                  className="absolute left-0 w-1 h-4 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border/50 space-y-4">
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <NotificationBell />
          <Link
            href="/tutor/settings"
            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        <div className="px-2 space-y-2">
          <Badge
            variant="outline"
            className="w-full justify-center py-1 bg-primary/10 border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest"
          >
            <GraduationCap className="h-3 w-3 mr-1" />
            {user.user_metadata?.role || "TUTOR"}
          </Badge>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 justify-center w-full py-2 rounded-xl bg-secondary text-foreground text-[10px] font-black uppercase tracking-widest border border-border hover:bg-secondary/70 transition-all"
          >
            <Sparkles className="h-3 w-3" /> Student Dashboard
          </Link>
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
            <button
              onClick={handleLogout}
              className="text-[10px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
