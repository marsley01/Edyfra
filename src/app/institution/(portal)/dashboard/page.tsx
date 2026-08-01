import { Suspense } from "react";
import {
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity as ActivityIcon,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  UploadCloud,
  UserPlus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/institution/stat-card";
import { PerformanceTrendChart } from "@/components/institution/charts/performance-trend-chart";
import { FlagBadge } from "@/components/institution/performance-badge";
import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import {
  getInstitutionOverview,
  getInstitutionPerformanceTrend,
  getFlaggedStudents,
  getRecentActivity,
  getCurrentTerm,
} from "@/app/actions/institution-admin";
import { formatDistanceToNow } from "date-fns";
import { getTimeGreeting } from "@/lib/greeting";

async function StatsGrid({ institutionId }: { institutionId: string }) {
  const stats = await getInstitutionOverview(institutionId);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total students" value={stats.totalStudents} icon={Users} accent="indigo" />
      <StatCard label="Teachers registered" value={stats.totalTeachers} icon={GraduationCap} accent="cyan" />
      <StatCard label="Active coaching" value={stats.activeCoachingSessions} icon={Calendar} accent="amber" />
      <StatCard label="Avg performance" value={`${stats.averagePerformance}%`} icon={TrendingUp} accent={stats.averagePerformance >= 50 ? "emerald" : "rose"} />
    </div>
  );
}

async function SetupChecklist({ institutionId }: { institutionId: string }) {
  const [stats, currentTerm] = await Promise.all([
    getInstitutionOverview(institutionId),
    getCurrentTerm(institutionId),
  ]);
  const trend = await getInstitutionPerformanceTrend(institutionId);
  const hasResults = trend.length > 0;
  const setupItems = [
    Boolean(currentTerm),
    stats.totalStudents > 0,
    stats.totalTeachers > 0,
    hasResults,
  ];
  const setupComplete = setupItems.filter(Boolean).length;
  const flagged = currentTerm
    ? await getFlaggedStudents(institutionId, currentTerm.term, currentTerm.year)
    : [];

  const nextActions = [
    !currentTerm ? { href: "/institution/dashboard/settings", icon: ClipboardList, title: "Set the current term", body: "Flagged students and term analytics need an active academic term." } : null,
    stats.totalStudents === 0 ? { href: "/institution/dashboard/students", icon: UserPlus, title: "Add students", body: "Start with the roster so results and coaching connect to real learners." } : null,
    stats.totalTeachers === 0 ? { href: "/institution/dashboard/teachers", icon: GraduationCap, title: "Invite teachers", body: "Teacher accounts make coaching assignments useful." } : null,
    !hasResults ? { href: "/institution/dashboard/results", icon: UploadCloud, title: "Upload results", body: "Results unlock average performance, trends, and risk flags." } : null,
    flagged.length > 0 ? { href: "/institution/dashboard/students", icon: AlertTriangle, title: "Review flagged students", body: `${flagged.length} learner${flagged.length === 1 ? "" : "s"} need attention this term.` } : null,
    currentTerm && hasResults && stats.activeCoachingSessions === 0 ? { href: "/institution/dashboard/coaching", icon: Calendar, title: "Plan coaching", body: "Assign support for learners who need extra help." } : null,
  ].filter(Boolean).slice(0, 3) as { href: string; icon: typeof ClipboardList; title: string; body: string }[];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Setup checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(setupComplete / 4) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-500">{setupComplete}/4</span>
          </div>
          {nextActions.length > 0 && (
            <div className="space-y-2">
              {nextActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.href} className="group flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700">{action.title}</p>
                      <p className="text-xs text-gray-500">{action.body}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-500" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {flagged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Students needing attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagged.slice(0, 5).map((s) => (
              <div key={s.studentUserId} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/institution/dashboard/students/${s.studentUserId}`} className="text-sm font-bold text-gray-900 hover:text-indigo-700">
                    {s.studentName}
                  </Link>
                  <p className="text-xs text-gray-500">{s.subject} · {s.form}</p>
                </div>
                <FlagBadge flag={s.flag as "CRITICAL" | "AT_RISK"} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

async function TrendChart({ institutionId }: { institutionId: string }) {
  const trend = await getInstitutionPerformanceTrend(institutionId);
  if (trend.length === 0) return null;
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Performance trend</CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceTrendChart points={trend} />
      </CardContent>
    </Card>
  );
}

async function ActivityFeed({ institutionId }: { institutionId: string }) {
  const activity = await getRecentActivity(institutionId);
  if (activity.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="h-4 w-4 text-gray-400" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activity.map((a) => (
          <div key={a.id} className="border-l-2 border-gray-100 pl-3 py-2">
            <p className="text-sm font-medium text-gray-900">{a.title}</p>
            {a.body && <p className="text-xs text-gray-500">{a.body}</p>}
            <p className="text-[11px] text-gray-400">{formatDistanceToNow(a.createdAt, { addSuffix: true })}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SectionFallback({ height = "h-32" }: { height?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-gray-100 bg-white ${height}`}>
      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
    </div>
  );
}

export default async function InstitutionOverviewPage() {
  const membership = await requireInstitutionAdmin();
  const inst = membership.institution;
  const greeting = getTimeGreeting(inst.adminName?.split(" ")[0] ?? "Admin");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Overview</p>
        <h1 className="text-2xl font-black text-gray-900">
          {greeting.text}{greeting.key === "late" ? "?" : "."} {greeting.emoji}
        </h1>
        <p className="text-sm text-gray-500">{inst.name}</p>
      </header>

      <Suspense fallback={<SectionFallback />}>
        <StatsGrid institutionId={inst.id} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<SectionFallback height="h-64" />}>
            <TrendChart institutionId={inst.id} />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <SetupChecklist institutionId={inst.id} />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<SectionFallback />}>
            <ActivityFeed institutionId={inst.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
