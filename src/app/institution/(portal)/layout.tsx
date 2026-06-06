import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  School,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getPlan } from "@/lib/institution-plans";
import { cn } from "@/lib/utils";

const NAV: { section: string; items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/institution/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    section: "People",
    items: [
      { href: "/institution/dashboard/students", label: "Students", icon: Users },
      { href: "/institution/dashboard/teachers", label: "Teachers", icon: GraduationCap },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/institution/dashboard/results", label: "Results & Analysis", icon: BarChart3 },
      { href: "/institution/dashboard/coaching", label: "Holiday Coaching", icon: Calendar },
      { href: "/institution/dashboard/reports", label: "Reports", icon: BookOpen },
    ],
  },
  {
    section: "Account",
    items: [
      { href: "/institution/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const membership = await requireInstitutionAdmin();
  const inst = membership.institution;
  const plan = getPlan(inst.planTier);

  // We can't usePathname in a server component — use a `headers` call instead.
  // For simplicity we just render a flat sidebar; the page provides its own title.
  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <Sidebar
        schoolName={inst.name}
        schoolCode={inst.code ?? "—"}
        role={membership.role}
        planName={plan.name}
        adminName={inst.adminName ?? "Admin"}
      />
      <div className="ml-64 flex flex-1 flex-col">
        <TopBar schoolName={inst.name} planName={plan.name} status={inst.status} />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({
  schoolName,
  schoolCode,
  role,
  planName,
  adminName,
}: {
  schoolName: string;
  schoolCode: string;
  role: string;
  planName: string;
  adminName: string;
}) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">
          E
        </div>
        <div>
          <div className="text-base font-semibold text-gray-900">Edyfra</div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
            <School className="h-3 w-3" />
            Institution Portal
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => (
          <div key={section.section} className="mb-5">
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {section.section}
            </div>
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{schoolCode}</span>
            <span className="truncate">{planName}</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">{schoolName}</p>
          <p className="text-[11px] text-gray-500">{adminName} · {role.replace(/_/g, " ").toLowerCase()}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await logout();
            redirect("/institution/login");
          }}
        >
          <button
            type="submit"
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-indigo-50/60 hover:text-indigo-700",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function TopBar({
  schoolName,
  planName,
  status,
}: {
  schoolName: string;
  planName: string;
  status: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-8">
      <div>
        <h1 className="text-base font-black text-gray-900">{schoolName}</h1>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          {planName} plan · <span className={status === "ACTIVE" ? "text-emerald-600" : "text-amber-600"}>{status}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/institution/dashboard/settings"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
