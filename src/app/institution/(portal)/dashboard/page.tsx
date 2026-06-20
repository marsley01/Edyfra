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

export default async function InstitutionOverviewPage() {
  const membership = await requireInstitutionAdmin();
  const inst = membership.institution;

  const [stats, trend, currentTerm, activity] = await Promise.all([
    getInstitutionOverview(inst.id),
    getInstitutionPerformanceTrend(inst.id),
    getCurrentTerm(inst.id),
    getRecentActivity(inst.id),
  ]);

  const flagged = currentTerm
    ? await getFlaggedStudents(inst.id, currentTerm.term, currentTerm.year)
    : [];
  const hasResults = trend.length > 0;
  const subjectsTracked = new Set(trend.map((point) => point.subject)).size;
  const termsTracked = new Set(trend.map((point) => `${point.year}-${point.termNum}`)).size;
  const setupItems = [
    Boolean(currentTerm),
    stats.totalStudents > 0,
    stats.totalTeachers > 0,
    hasResults,
  ];
  const setupComplete = setupItems.filter(Boolean).length;
  const nextActions = [
    !currentTerm
      ? {
          href: "/institution/dashboard/settings",
          icon: ClipboardList,
          title: "Set the current term",
          body: "Flagged students and term analytics need an active academic term.",
        }
      : null,
    stats.totalStudents === 0
      ? {
          href: "/institution/dashboard/students",
          icon: UserPlus,
          title: "Add students",
          body: "Start with the roster so results and coaching connect to real learners.",
        }
      : null,
    stats.totalTeachers === 0
      ? {
          href: "/institution/dashboard/teachers",
          icon: GraduationCap,
          title: "Invite teachers",
          body: "Teacher accounts make coaching assignments and staff reporting useful.",
        }
      : null,
    !hasResults
      ? {
          href: "/institution/dashboard/results",
          icon: UploadCloud,
          title: "Upload results",
          body: "Results unlock average performance, trends, and risk flags.",
        }
      : null,
    flagged.length > 0
      ? {
          href: "/institution/dashboard/students",
          icon: AlertTriangle,
          title: "Review flagged students",
          body: `${flagged.length} learner${flagged.length === 1 ? "" : "s"} need attention this term.`,
        }
      : null,
    currentTerm && hasResults && stats.activeCoachingSessions === 0
      ? {
          href: "/institution/dashboard/coaching",
          icon: Calendar,
          title: "Plan coaching",
          body: "Assign support for learners who need extra holiday or term help.",
        }
      : null,
  ].filter(Boolean).slice(0, 3) as {
    href: string;
    icon: typeof ClipboardList;
    title: string;
    body: string;
  }[];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Overview</p>
        <h1 className="text-2xl font-black text-gray-900">
          {(() => { const g = getTimeGreeting(inst.adminName?.split(" ")[0] ?? "Admin"); return `${g.text}${g.key === "late" ? "?" : "."} ${g.emoji}`; })()}
        </h1>
        <p className="text-sm text-gray-500">
          {currentTerm
            ? `Term ${currentTerm.term} ${currentTerm.year} at ${inst.name}.`
            : `Finish setup for ${inst.name} to make the dashboard actionable.`}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={stats.totalStudents}
          icon={Users}
          accent="indigo"
        />
        <StatCard
          label="Teachers registered"
          value={stats.totalTeachers}
          icon={GraduationCap}
          accent="cyan"
        />
        <StatCard
          label="Active coaching"
          value={stats.activeCoachingSessions}
          icon={Calendar}
          accent="emerald"
          hint="This term"
        />
        <StatCard
          label="Avg performance"
          value={hasResults ? `${stats.averagePerformance}%` : "No data"}
          icon={TrendingUp}
          accent="violet"
          hint={hasResults ? "Latest uploaded results" : "Upload results to calculate this"}
        />
      </div>

      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-gray-900">Portal readiness</h2>
                <p className="text-sm text-gray-500">
                  {setupComplete}/4 essentials complete
                  {hasResults ? ` - ${subjectsTracked} subjects across ${termsTracked} term${termsTracked === 1 ? "" : "s"}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["Current term", Boolean(currentTerm)],
                ["Student roster", stats.totalStudents > 0],
                ["Teacher roster", stats.totalTeachers > 0],
                ["Results uploaded", hasResults],
              ].map(([label, done]) => (
                <div
                  key={String(label)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                    done
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-amber-100 bg-amber-50 text-amber-800"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Next best action</p>
            <div className="mt-3 space-y-2">
              {nextActions.length === 0 ? (
                <p className="rounded-lg bg-white p-3 text-sm font-medium text-gray-600">
                  Everything important is set. Keep reviewing results and activity weekly.
                </p>
              ) : (
                nextActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="flex items-start gap-3 rounded-lg bg-white p-3 text-left transition-colors hover:bg-indigo-50"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      <span>
                        <span className="block text-sm font-black text-gray-900">{action.title}</span>
                        <span className="block text-xs text-gray-500">{action.body}</span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-black">Performance trend</CardTitle>
              <p className="text-xs text-gray-500">Average marks per subject over the last 3 terms.</p>
            </div>
            <Link
              href="/institution/dashboard/results"
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50"
            >
              Open analysis <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <PerformanceTrendChart points={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Flagged students
            </CardTitle>
            <p className="text-xs text-gray-500">
              {currentTerm && hasResults
                ? `Below 50% in any subject - Term ${currentTerm.term} ${currentTerm.year}`
                : !currentTerm
                  ? "Set the current term in Settings to see flagged students."
                  : "Upload results to identify flagged students."}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {flagged.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {currentTerm
                  ? hasResults
                    ? "No students are below 50% this term. Nice work!"
                    : "Upload this term's results to see who needs attention."
                  : "Set the current term in Settings."}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {flagged.slice(0, 8).map((f) => (
                  <li key={`${f.studentUserId}-${f.subject}`}>
                    <Link
                      href={`/institution/dashboard/students/${f.studentUserId}`}
                      className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-indigo-50/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{f.studentName}</p>
                        <p className="text-xs text-gray-500">
                          {f.subject} · {f.form}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 tabular-nums">{f.marks.toFixed(0)}%</span>
                        <FlagBadge flag={f.flag as "CRITICAL" | "AT_RISK"} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <ActivityIcon className="h-4 w-4 text-indigo-500" />
            Recent activity
          </CardTitle>
          <p className="text-xs text-gray-500">Last 10 actions in your institution.</p>
        </CardHeader>
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{a.title}</p>
                    {a.body && <p className="text-xs text-gray-500">{a.body}</p>}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {a.actorName ? `${a.actorName} · ` : ""}
                      {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
