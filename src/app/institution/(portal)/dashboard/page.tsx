import {
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity as ActivityIcon,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/institution/stat-card";
import { PerformanceTrendChart } from "@/components/institution/charts/performance-trend-chart";
import { FlagBadge, PerformanceBadge } from "@/components/institution/performance-badge";
import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import {
  getInstitutionOverview,
  getInstitutionPerformanceTrend,
  getFlaggedStudents,
  getRecentActivity,
  getCurrentTerm,
} from "@/app/actions/institution-admin";
import { formatDistanceToNow } from "date-fns";

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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Overview</p>
        <h1 className="text-2xl font-black text-gray-900">Welcome back, {inst.adminName?.split(" ")[0] ?? "Admin"}</h1>
        <p className="text-sm text-gray-500">
          Here's what's happening at {inst.name} this term.
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
          value={`${stats.averagePerformance}%`}
          icon={TrendingUp}
          accent="violet"
          hint="All subjects, current term"
        />
      </div>

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
              {currentTerm
                ? `Below 50% in any subject · Term ${currentTerm.term} ${currentTerm.year}`
                : "Set the current term in Settings to see flagged students."}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {flagged.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {currentTerm
                  ? "No students are below 50% this term. Nice work!"
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
