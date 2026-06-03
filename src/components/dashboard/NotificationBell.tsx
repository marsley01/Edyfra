"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getUnreadCount, getLatestNotification } from "@/app/actions/notifications";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);
  const pathname = usePathname();
  const href = pathname.startsWith("/tutor") ? "/tutor/notifications" : "/dashboard/notifications";

  useEffect(() => {
    // Request notification permission if not already granted/denied
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const fetchCounts = async () => {
      try {
        const [count, latest] = await Promise.all([
          getUnreadCount(),
          getLatestNotification(),
        ]);
        
        setUnread(count);

        if (latest) {
          setLastNotifId((prev) => {
            // If we have a previous ID and this is a new one
            if (prev && prev !== latest.id) {
              // Only notify if it was created recently (e.g., within last 5 minutes)
              const createdAge = Date.now() - new Date(latest.createdAt).getTime();
              if (createdAge < 5 * 60 * 1000) {
                // Play sound
                const audio = new Audio("/sounds/ding.mp3");
                audio.play().catch(e => console.warn("Audio play blocked", e));

                // Show browser notification
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(latest.title || "New Notification", {
                    body: latest.body || "",
                    icon: "/icons/icon-192.png",
                  });
                }
              }
            }
            // Always update to the latest ID
            return latest.id;
          });
        }
      } catch (err) {
        console.error("Failed to fetch notifications for bell", err);
      }
    };

    fetchCounts();
    // Poll every 30 seconds for snappier foreground notifications
    const interval = setInterval(fetchCounts, 30000);
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
