"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, Users, GraduationCap, 
  Clock, Wallet, MessageSquare, Settings,
  LogOut, Bell, Calendar, Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkTutor();
  }, []);

  const checkTutor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.user_metadata?.role !== "TUTOR") {
      router.push("/dashboard");
      return;
    }

    setUser(user);
    setLoading(false);
  };

  if (loading) return null;

  const navItems = [
    { href: "/tutor", label: "Tutor Desk", icon: LayoutDashboard },
    { href: "/tutor/requests", label: "Student Requests", icon: Users },
    { href: "/tutor/sessions", label: "Active Sessions", icon: Zap },
    { href: "/tutor/schedule", label: "Availability", icon: Calendar },
    { href: "/tutor/earnings", label: "Earnings", icon: Wallet },
    { href: "/tutor/settings", label: "Profile Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Tutor Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <Link href="/tutor" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <GraduationCap className="text-white h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Edyfra <span className="text-teal-600 font-black">Expert</span></span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                pathname === item.href
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                  : "text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
          
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user.user_metadata?.full_name || "Expert"}</p>
              <Badge className="bg-teal-600/10 text-teal-600 border-none text-[8px] h-4 font-black">VERIFIED TUTOR</Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
