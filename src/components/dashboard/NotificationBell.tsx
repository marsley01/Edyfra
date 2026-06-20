"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  variant?: "icon" | "topbar";
  className?: string;
}

export function NotificationBell({ variant = "icon", className }: NotificationBellProps) {
  const { count } = useUnreadNotifications();
  const pathname = usePathname();
  const href = pathname.startsWith("/tutor") ? "/tutor/notifications" : "/dashboard/notifications";

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const badgeText = count > 99 ? "99+" : String(count);
  const ariaLabel = `Notifications${count > 0 ? `, ${count} unread` : ""}`;

  if (variant === "topbar") {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-card/60 backdrop-blur-md text-foreground/80 transition-all hover:bg-card hover:text-foreground hover:border-primary/40 shadow-sm",
          className
        )}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center px-1 leading-none shadow-lg shadow-primary/40 ring-2 ring-background animate-pulse">
            {badgeText}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all",
        className
      )}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center px-1 leading-none shadow-lg shadow-primary/30 animate-pulse">
          {badgeText}
        </span>
      )}
    </Link>
  );
}

/**
 * Compact inline badge (just the number) — used next to nav items in sidebars
 * and on tabs. Hidden when count is 0.
 */
export function NotificationCountBadge({ className }: { className?: string }) {
  const { count } = useUnreadNotifications();
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center leading-none shadow-sm shadow-primary/30 animate-pulse",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
