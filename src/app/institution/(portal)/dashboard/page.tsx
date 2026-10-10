import { Suspense } from "react";
import {
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity as ActivityIcon,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  UploadCloud,
  UserPlus,
  Loader2,
  Award,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/institution/stat-card";
import { TermTrendChart } from "@/components/institution/charts/term-trend-chart";
import { TermPicker } from "@/components/institution/term-picker";
import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getInstitutionOverview, getRecentActivity, getCurrentTerm } from "@/app/actions/institution-admin";
import { getAtRiskStudents, getInstitutionKpis } from "@/app/actions/institution-analytics";
import { gradeForScore, parseTermParam, type TermRef } from "@/lib/institution-analytics";
import { formatDistanceToNow } from "date-fns";
import { getTimeGreeting } from "@/lib/greeting";

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

async function KpiGrid({ institutionId, term }: { institutionId: string; term: TermRef | null }) {
  const [kpis, overview] = await Promise.all([
    getInstitutionKpis(institutionId, term),
    getInstitutionOverview(institutionId),
  ]);
  const vs = kpis.previousLabel ? `vs ${kpis.previousLabel}` : undefined;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Enrolment"
        value={kpis.enrolment}
        icon={Users}
        accent="indigo"
        hint={kpis.focusLabel ? `${kpis.assessedStudents} assessed in ${kpis.focusLabel}` : "No results uploaded yet"}
      />
      <StatCard
        label="Active (7 days)"
        value={kpis.active7d}
        icon={ActivityIcon}
        accent="cyan"
        hint={`${pct(kpis.active7d, kpis.enrolment)}% of students · ${kpis.active30d} in 30 days`}
      />
      <StatCard
        label="Mean score"
        value={kpis.meanScore != null ? `${kpis.meanScore}%` : "—"}
        icon={TrendingUp}
        accent={kpis.meanScore == null ? "indigo" : kpis.meanScore >= 50 ? "emerald" : "rose"}
        delta={kpis.meanScoreDelta ?? undefined}
        deltaUnit=" marks"
        deltaLabel={vs}
        hint={kpis.focusLabel ?? undefined}
      />
      <StatCard
        label="Mean grade"
        value={kpis.meanGrade ?? "—"}
        icon={Award}
        accent="violet"
        delta={kpis.meanPointsDelta ?? undefined}
        deltaUnit=" pts"
        deltaLabel={vs}
        hint={kpis.meanPoints != null ? `${kpis.meanPoints.toFixed(2)} mean points (KCSE 12-point)` : undefined}
      />
      <StatCard label="Teachers" value={overview.totalTeachers} icon={GraduationCap} accent="amber" />
      <StatCard label="Active coaching" value={overview.activeCoachingSessions} icon={Calendar} accent="emerald" />
    </div>
  );
}

async function TrendAndSubjects({ institutionId, term }: { institutionId: string; term: TermRef | null }) {
  const kpis = await getInstitutionKpis(institutionId, term);
  if (!kpis.focus) return null;
  const totalGraded = kpis.gradeDistribution.reduce((s, g) => s + g.count, 0);
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">School performance by term</CardTitle>
          <p className="text-xs text-gray-500">Mean score and KCSE mean points over the last {kpis.termSeries.length} terms with results.</p>
        </CardHeader>
        <CardContent>
          <TermTrendChart series={kpis.termSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subject means · {kpis.focusLabel}</CardTitle>
          <p className="text-xs text-gray-500">
            {kpis.previousLabel ? `Change against ${kpis.previousLabel}.` : "Upload another term to see changes."}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  {["Subject", "Mean", "Grade", "Entries", "Change"].map((h) => (
                    <th key={h} className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.subjectMeans.map((s) => (
                  <tr key={s.subject} className="border-b border-gray-50">
                    <td className="px-5 py-2 font-bold text-gray-900">{s.subject}</td>
                    <td className="px-5 py-2 tabular-nums">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${s.mean >= 50 ? "bg-emerald-500" : "bg-rose-500"}`}
                            style={{ width: `${Math.min(100, s.mean)}%` }}
                          />
                        </div>
                        {s.mean}%
                      </div>
                    </td>
                    <td className="px-5 py-2 font-bold text-gray-700">{gradeForScore(s.mean).grade}</td>
                    <td className="px-5 py-2 tabular-nums text-gray-500">{s.students}</td>
                    <td className="px-5 py-2">
                      <Delta value={s.delta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalGraded > 0 && (
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                Student mean-grade distribution
              </p>
              <div className="flex h-16 items-end gap-1">
                {kpis.gradeDistribution.map((g) => (
                  <div key={g.grade} className="flex flex-1 flex-col items-center gap-1" title={`${g.grade}: ${g.count}`}>
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${Math.max(2, (g.count / totalGraded) * 100)}%` }}
                    />
                    <span className="text-[10px] font-bold text-gray-500">{g.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>;
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
        up ? "bg-emerald-50 text-emerald-700" : down ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {up && <ArrowUpRight className="h-3 w-3" />}
      {down && <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}
    </span>
  );
}

async function Movers({ institutionId, term }: { institutionId: string; term: TermRef | null }) {
  const kpis = await getInstitutionKpis(institutionId, term);
  if (!kpis.previousLabel) return null;
  const { top, bottom } = kpis.movers;
  if (top.length === 0 && bottom.length === 0) return null;
  const List = ({ rows, tone }: { rows: typeof top; tone: "up" | "down" }) => (
    <ul className="space-y-1.5">
      {rows.map((m) => (
        <li key={m.studentId} className="flex items-center justify-between gap-2 text-sm">
          <Link href={`/institution/dashboard/students/${m.studentId}`} className="truncate font-bold text-gray-900 hover:text-primary">
            {m.name}
          </Link>
          <span className={`shrink-0 text-xs font-black ${tone === "up" ? "text-emerald-600" : "text-rose-600"}`}>
            {m.previous} → {m.current} ({m.delta > 0 ? "+" : ""}
            {m.delta})
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Biggest movers</CardTitle>
        <p className="text-xs text-gray-500">
          Mean score change, {kpis.previousLabel} → {kpis.focusLabel}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {top.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Most improved</p>
            <List rows={top} tone="up" />
          </div>
        )}
        {bottom.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Largest drops</p>
            <List rows={bottom} tone="down" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function AtRiskCard({ institutionId, term }: { institutionId: string; term: TermRef | null }) {
  const risk = await getAtRiskStudents(institutionId, { term, pageSize: 5 });
  if (!risk.focusLabel) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          Students at risk
        </CardTitle>
        <p className="text-xs text-gray-500">
          {risk.counts.HIGH} high · {risk.counts.MEDIUM} medium risk. Score weighs falling trend, distance below class mean,
          missed assessments and inactivity.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {risk.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No student is currently at medium or high risk.</p>
        ) : (
          risk.rows.map((r) => (
            <div key={r.studentId} className="rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/institution/dashboard/students/${r.studentId}`} className="truncate text-sm font-bold text-gray-900 hover:text-primary">
                  {r.name}
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    r.level === "HIGH" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {r.score}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {r.className}
                {r.stream ? ` ${r.stream}` : ""} · {r.reasons[0] ?? "Multiple small signals"}
              </p>
            </div>
          ))
        )}
        {risk.total > risk.rows.length && (
          <Link href="/institution/dashboard/results#at-risk" className="inline-flex items-center gap-1 text-xs font-bold text-primary">
            See all {risk.total} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

async function SetupChecklist({ institutionId }: { institutionId: string }) {
  const [stats, currentTerm, kpis] = await Promise.all([
    getInstitutionOverview(institutionId),
    getCurrentTerm(institutionId),
    getInstitutionKpis(institutionId, null),
  ]);
  const hasResults = kpis.availableTerms.length > 0;
  const setupItems = [Boolean(currentTerm), stats.totalStudents > 0, stats.totalTeachers > 0, hasResults];
  const setupComplete = setupItems.filter(Boolean).length;
  if (setupComplete === setupItems.length) return null;

  const nextActions = [
    !currentTerm ? { href: "/institution/dashboard/settings", icon: ClipboardList, title: "Set the current term", body: "Term analytics and coaching windows need an active academic term." } : null,
    stats.totalStudents === 0 ? { href: "/institution/dashboard/students", icon: UserPlus, title: "Add students", body: "Start with the roster so results and coaching connect to real learners." } : null,
    stats.totalTeachers === 0 ? { href: "/institution/dashboard/teachers", icon: GraduationCap, title: "Invite teachers", body: "Teacher subject assignments power coaching matches and value-added." } : null,
    !hasResults ? { href: "/institution/dashboard/results", icon: UploadCloud, title: "Upload results", body: "Results unlock mean grades, trends, rankings and risk scores." } : null,
  ].filter(Boolean) as { href: string; icon: typeof ClipboardList; title: string; body: string }[];

  return (
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
        <div className="space-y-2">
          {nextActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-primary">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.body}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

async function ActivityFeed({ institutionId }: { institutionId: string }) {
  const activity = await getRecentActivity(institutionId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="h-4 w-4 text-gray-400" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activity.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet. Uploads, invitations and coaching changes appear here.</p>
        ) : (
          activity.map((a) => (
            <div key={a.id} className="border-l-2 border-gray-100 py-2 pl-3">
              <p className="text-sm font-medium text-gray-900">{a.title}</p>
              {a.body && <p className="text-xs text-gray-500">{a.body}</p>}
              <p className="text-[11px] text-gray-400">
                {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                {a.actorName ? ` · ${a.actorName}` : ""}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

async function HeaderTermPicker({ institutionId, term }: { institutionId: string; term: TermRef | null }) {
  const kpis = await getInstitutionKpis(institutionId, term);
  return <TermPicker terms={kpis.availableTerms} value={kpis.focus} />;
}

function SectionFallback({ height = "h-32" }: { height?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-gray-100 bg-white ${height}`}>
      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
    </div>
  );
}

export default async function InstitutionOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const membership = await requireInstitutionAdmin();
  const inst = membership.institution;
  const term = parseTermParam((await searchParams).term);
  const greeting = getTimeGreeting(inst.adminName?.split(" ")[0] ?? "Admin");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Overview</p>
          <h1 className="text-2xl font-black text-gray-900">
            {greeting.text}
            {greeting.key === "late" ? "?" : "."} {greeting.emoji}
          </h1>
          <p className="text-sm text-gray-500">{inst.name}</p>
        </div>
        <Suspense fallback={null}>
          <HeaderTermPicker institutionId={inst.id} term={term} />
        </Suspense>
      </header>

      <Suspense fallback={<SectionFallback />}>
        <KpiGrid institutionId={inst.id} term={term} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<SectionFallback height="h-64" />}>
            <SetupChecklist institutionId={inst.id} />
          </Suspense>
          <Suspense fallback={<SectionFallback height="h-96" />}>
            <TrendAndSubjects institutionId={inst.id} term={term} />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<SectionFallback />}>
            <AtRiskCard institutionId={inst.id} term={term} />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <Movers institutionId={inst.id} term={term} />
          </Suspense>
          <Suspense fallback={<SectionFallback />}>
            <ActivityFeed institutionId={inst.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
