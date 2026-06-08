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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
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
        "flex flex-col bg-card border-r border-border/60 transition-all duration-200",
        onClose ? "h-full w-full" : "w-64 h-[calc(100vh-5rem)] sticky top-20 hidden lg:flex",
      )}
    >
      {onClose && (
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Brand header */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary/60 transition-all cursor-pointer group">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Image
              src="/image.png"
              alt="Edyfra"
              width={28}
              height={28}
              className="rounded-lg object-cover"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold tracking-tight text-foreground">Edyfra</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      </div>

      {/* Nav — rounded card grouping */}
      <nav className="flex-1 px-3 pb-2 overflow-y-auto scrollbar-none space-y-1">
        {navItems.map(({ href, label, icon: Icon, showCount }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="truncate">{label}</span>
              {showCount && <NotificationCountBadge />}
            </Link>
          );
        })}
      </nav>

      {/* User section — rounded card */}
      <div className="p-4 pt-2 space-y-3">
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <NotificationBell />
          <Link
            href="/tutor/settings"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            aria-label="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </Link>
        </div>

        <div className="rounded-xl bg-secondary/40 border border-border/40 p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 rounded-xl shadow-sm">
              <AvatarImage src={avatar || undefined} alt={displayName} className="rounded-xl object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                {displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
              <span className="text-[11px] font-medium text-muted-foreground">{user.user_metadata?.role || "TUTOR"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
              <Trophy className="h-3.5 w-3.5" />
              {points?.toLocaleString() || "0"} pts
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Student Hub &rarr;
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
