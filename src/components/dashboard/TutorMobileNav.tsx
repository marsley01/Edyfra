"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorSidebar } from "./TutorSidebar";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export function TutorMobileNav({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const showBackButton = pathname !== "/tutor";

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <header className="h-14 sm:h-16 bg-background/80 backdrop-blur-md border-b border-border px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Link
            href="/tutor"
            className="flex items-center gap-2 min-w-0"
            onClick={() => setIsOpen(false)}
          >
            <Image
              src="/image.png"
              alt="Edyfra Logo"
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-lg object-cover"
              priority
            />
            <span className="text-lg sm:text-xl font-black text-foreground tracking-tighter">
              Edyfra
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationBell variant="topbar" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="rounded-xl hover:bg-primary/5"
            aria-label="Open tutor menu"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-80 bg-background z-[110] shadow-2xl overflow-hidden lg:hidden"
            >
              <div className="absolute top-0 left-0 w-full h-80 bg-primary/10 blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-full h-80 bg-primary/5 blur-[120px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative z-10 h-full">
                <TutorSidebar user={user} onClose={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
