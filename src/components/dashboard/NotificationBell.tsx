"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/app/actions/notifications";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const href = pathname.startsWith("/tutor") ? "/tutor/notifications" : "/dashboard/notifications";

  useEffect(() => {
    const fetch = async () => {
      const count = await getUnreadCount();
      setUnread(count);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href={href}
      className="relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center px-1 leading-none shadow-lg shadow-primary/30 animate-pulse">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
