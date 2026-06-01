"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Megaphone,
  Users,
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Settings,
  CreditCard,
  ChevronDown,
  LogOut,
  Building2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserInstitution } from "@/app/actions/institution-data";
import { logout } from "@/app/actions/auth";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/institution/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/institution/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/institution/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/institution/students", label: "Students", icon: Users },
      { href: "/institution/tutors", label: "Tutors", icon: GraduationCap },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/institution/resources", label: "Resources", icon: BookOpen },
      { href: "/institution/sessions", label: "Sessions", icon: Video },
      { href: "/institution/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/institution/settings", label: "Settings", icon: Settings },
      { href: "/institution/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [instData, setInstData] = useState<{
    name: string;
    initials: string;
    plan: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const membership = await getUserInstitution();
        if (membership) {
          const name = membership.institution.name;
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          setInstData({
            name,
            initials,
            plan: membership.institution.plan,
            role: membership.role,
          });
        }
      } catch {
        setInstData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSignOut() {
    await logout();
    router.push("/institution/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3730A3] text-white text-sm font-bold">
            E
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">Edyfra</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <Building2 className="h-3 w-3" />
              Institution Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/institution/dashboard"
                    ? pathname === "/institution/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#3730A3]/10 text-[#3730A3]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : instData ? (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3730A3] text-xs font-bold text-white">
                {instData.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {instData.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-[#3730A3]/10 px-2 py-0.5 text-[10px] font-medium text-[#3730A3] capitalize">
                    {instData.plan}
                  </span>
                  <span className="text-[10px] text-gray-400 capitalize">· {instData.role.replace(/_/g, " ").toLowerCase()}</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </div>
          ) : null}
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-8">
          <h1 className="text-lg font-semibold text-gray-900">
            Institution Portal
          </h1>
          <div className="flex items-center gap-3">
            {instData && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3730A3]/10 px-3 py-1 text-xs font-medium text-[#3730A3] capitalize">
                <Building2 className="h-3.5 w-3.5" />
                {instData.role.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
