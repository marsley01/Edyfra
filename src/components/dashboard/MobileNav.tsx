"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, GraduationCap, ChevronLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "./Sidebar";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

export default function MobileNav({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const showBackButton = pathname !== "/dashboard";
  const isTutor = user?.user_metadata?.role === "TUTOR";

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when menu is open
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
      {/* Mobile Header */}
         <header className="h-14 sm:h-16 bg-background/80 backdrop-blur-md border-b border-border px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg sm:text-xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
        </div>
             <Button 
           variant="ghost" 
           size="icon" 
           onClick={() => setIsOpen(true)}
           className="rounded-xl hover:bg-primary/5"
           aria-label="Open dashboard menu"
           aria-expanded={isOpen}
         >
           <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
         </Button>
      </header>

      {/* Full Screen Drawer */}
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 w-full h-full bg-background z-[70] shadow-2xl overflow-y-auto overscroll-y-contain"
            >
              <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-background">
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="text-xl font-black text-foreground tracking-tighter">Edyfra</span>
                </Link>
                <div className="flex items-center gap-2">
                  {isTutor && (
                    <Link
                      href="/tutor"
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                      aria-label="Tutor Dashboard"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl bg-secondary/50 hover:bg-secondary"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <DashboardSidebar user={user} onClose={() => setIsOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
