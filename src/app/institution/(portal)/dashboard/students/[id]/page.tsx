import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Download,
  Flame,
  GraduationCap,
  Mail,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Initials } from "@/components/institution/initials";
import {
  FlagBadge,
  PerformanceBadge,
  TrendIndicator,
} from "@/components/institution/performance-badge";
import { StudentRadarChart } from "@/components/institution/charts/student-radar-chart";
import { SubjectBarChart } from "@/components/institution/charts/subject-bar-chart";
import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getStudentFullProfile } from "@/app/actions/institution-student-profile";
import { generateStudentInsight, emailInsightToTeacher } from "@/app/actions/institution-ai";
import { StudentInsightButton } from "./insight-button";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await requireInstitutionAdmin();
  const inst = membership.institution;
  const profile = await getStudentFullProfile(id, inst.id);
  if (!profile) notFound();

  const term = profile.currentTerm;

  // Prepare history data for the trend chart
  const historyByTerm = new Map<string, number>();
  for (const h of profile.history) {
    const k = `T${h.term} ${h.year}`;
    historyByTerm.set(k, (historyByTerm.get(k) ?? 0) + h.marks);
  }
  const subjectCount = new Map<string, number>();
  for (const h of profile.history) {
    const k = `T${h.term} ${h.year}`;
    subjectCount.set(k, (subjectCount.get(k) ?? 0) + 1);
  }
  const trendData = Array.from(historyByTerm.entries()).map(([k, sum]) => ({
    name: k,
    average: Math.round((sum / (subjectCount.get(k) ?? 1)) * 10) / 10,
  }));

  const termComparisonData = profile.currentResults.map((r) => ({
    name: r.subject,
    thisTerm: r.marks,
    lastTerm: (() => {
      const last = profile.history
        .filter((h) => h.subject === r.subject)
        .sort((a, b) => b.year * 10 + b.term - (a.year * 10 + a.term))[1];
      return last?.marks ?? 0;
    })(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <LinkButton href="/institution/dashboard/students" variant="ghost" size="sm" className="text-gray-500">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to students
        </LinkButton>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Initials name={profile.user.name} className="!h-16 !w-16 !text-lg" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-gray-900">{profile.user.name}</h1>
                  <PerformanceBadge status={(profile.currentResults[0]?.overallStatus ?? null) as "RED" | "YELLOW" | "GREEN" | null} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {profile.user.educationLevel === "UNIVERSITY" ? "Year" : "Form"}{" "}
                  {profile.user.formYear ?? "—"} ·{" "}
                  <a className="hover:underline" href={`mailto:${profile.user.email}`}>
                    {profile.user.email}
                  </a>
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  Joined{" "}
                  {format(profile.membership.joinedAt, "d MMM yyyy")} ·{" "}
                  {profile.membership.status.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:gap-6">
              <Stat icon={Trophy} label="Total sessions" value={profile.totalSessions} />
              <Stat icon={Flame} label="XP points" value={profile.totalXp} />
              <Stat
                icon={Calendar}
                label="Last active"
                value={profile.user.lastActiveAt ? format(profile.user.lastActiveAt, "d MMM") : "—"}
                small
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Academic snapshot</CardTitle>
            <p className="text-xs text-gray-500">
              {term ? `Term ${term.term} ${term.year}` : "No current term set"}
            </p>
          </CardHeader>
          <CardContent>
            <StudentRadarChart
              data={profile.currentResults.map((r) => ({
                subject: r.subject,
                marks: r.marks,
                flag: r.flag,
              }))}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">This term vs last term</CardTitle>
            <p className="text-xs text-gray-500">Marks per subject, side by side.</p>
          </CardHeader>
          <CardContent>
            <SubjectBarChart
              data={termComparisonData}
              series={[
                { name: "This term", dataKey: "thisTerm", color: "#3730A3" },
                { name: "Last term", dataKey: "lastTerm", color: "#9ca3af" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-black">Current term results</CardTitle>
            <p className="text-xs text-gray-500">Marks, grade, trend, and flag for each subject.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                {["Subject", "Marks", "Grade", "Trend", "Flag"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.currentResults.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                    No results for the current term yet.
                  </td>
                </tr>
              ) : (
                profile.currentResults.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-900">{r.subject}</td>
                    <td className="px-5 py-3 font-black tabular-nums text-gray-900">
                      {r.marks.toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r.grade ?? "—"}</td>
                    <td className="px-5 py-3">
                      <TrendIndicator trend={r.trend as "IMPROVING" | "DECLINING" | "STABLE"} />
                    </td>
                    <td className="px-5 py-3">
                      <FlagBadge flag={r.flag as "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="h-4 w-4 text-indigo-500" /> AI Insight
            </CardTitle>
            <p className="text-xs text-gray-500">
              Generated by OpenRouter · targets the strongest area, biggest weakness, and a holiday coaching focus.
            </p>
          </div>
          {term && (
            <StudentInsightButton
              studentUserId={profile.user.id}
              term={term.term}
              year={term.year}
              hasExisting={!!profile.currentResults[0]?.aiInsight}
            />
          )}
        </CardHeader>
        <CardContent>
          {profile.currentResults[0]?.aiInsight ? (
            <p className="text-sm leading-relaxed text-gray-800">
              {profile.currentResults[0].aiInsight}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              No insight yet. Click <span className="font-bold text-gray-700">Generate insight</span> to create one.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <GraduationCap className="h-4 w-4 text-indigo-500" /> Sessions attended
            </CardTitle>
            <p className="text-xs text-gray-500">Last 20 Edyfra sessions.</p>
          </CardHeader>
          <CardContent className="p-0">
            {profile.sessions.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-500">No sessions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {profile.sessions.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{s.subject}</p>
                      <p className="text-xs text-gray-500">
                        {s.topic ? `${s.topic} · ` : ""}with {s.partnerName ?? "AI Tutor"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{format(s.date, "d MMM")}</p>
                      {s.duration && <p>{s.duration} min</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <Bot className="h-4 w-4 text-indigo-500" /> Edyfra activity
            </CardTitle>
            <p className="text-xs text-gray-500">Mash AI, challenges, and resources.</p>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-3 text-center">
              <ActivityStat label="Mash AI chats" value={profile.mashUsage} />
              <ActivityStat label="Challenges" value={profile.challenges.length} />
              <ActivityStat label="Resources" value={profile.resourceDownloads} />
            </ul>
            {profile.challenges.length > 0 && (
              <ul className="mt-5 space-y-2">
                {profile.challenges.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-800">{c.subject}</span>
                    <span className="text-xs text-gray-500">
                      {format(c.completedAt, "d MMM")} · {c.score} pts
                    </span>
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
            <Users className="h-4 w-4 text-indigo-500" /> Coaching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
              Current assignment
            </h3>
            {profile.coaching.current.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No active coaching assignment.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {profile.coaching.current.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {c.subject} with {c.teacherName}
                      </p>
                      <p className="text-xs text-gray-600">{c.schedule ?? "Schedule to be confirmed"}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(c.startDate, "d MMM")} – {format(c.endDate, "d MMM yyyy")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
              History
            </h3>
            {profile.coaching.past.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No past coaching.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {profile.coaching.past.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {c.subject} with {c.teacherName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.sessionsAttended}/{c.sessionsScheduled} sessions attended
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(c.startDate, "d MMM")} – {format(c.endDate, "d MMM yyyy")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <div className="text-[11px] text-gray-400">
        <p>
          <Mail className="mr-1 inline h-3 w-3" /> Note: per Edyfra policy, school admins can see
          performance and engagement but never the contents of this student's chat messages.
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className={`mt-1 font-black text-gray-900 ${small ? "text-sm" : "text-lg"} tabular-nums`}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-2xl font-black tabular-nums text-gray-900">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
    </li>
  );
}
