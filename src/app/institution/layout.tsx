"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/institution", label: "Dashboard", icon: LayoutDashboard },
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

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/institution"
                    ? pathname === "/institution"
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

        {/* Institution Chip */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3730A3] text-xs font-bold text-white">
              KU
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-900">
                Kenyatta University
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-[#3730A3]/10 px-2 py-0.5 text-[10px] font-medium text-[#3730A3]">
                  Premium
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </div>
          <Link
            href="/institution/login"
            className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-8">
          <h1 className="text-lg font-semibold text-gray-900">
            Overview — May 2026
          </h1>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
              <FileText className="h-4 w-4" />
              Export Report
            </button>
            <Link href="/institution/announcements">
              <button className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3730A3]/90">
                <Megaphone className="h-4 w-4" />
                Announce
              </button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
