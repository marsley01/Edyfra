"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Users,
  Video,
  TrendingUp,
  Star,
  Bell,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
} from "lucide-react";

/* ── Mini components ── */

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  positive = true,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3730A3]/10">
          <Icon className="h-4 w-4 text-[#3730A3]" />
        </div>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            positive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {trend}
        </span>
      </div>
      <div className="mt-3">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function StudentRow({
  initials,
  name,
  detail,
  progress,
}: {
  initials: string;
  name: string;
  detail: string;
  progress: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3730A3]/10 text-xs font-bold text-[#3730A3]">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">{name}</div>
        <div className="text-xs text-gray-400">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 rounded-full bg-gray-100 sm:w-20">
          <div
            className="h-full rounded-full bg-[#3730A3]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600">{progress}%</span>
      </div>
    </div>
  );
}

function ActivityItem({
  color,
  text,
  time,
}: {
  color: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Circle className="mt-0.5 h-2.5 w-2.5 shrink-0 fill-current" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-700">{text}</div>
        <div className="mt-0.5 text-xs text-gray-400">{time}</div>
      </div>
    </div>
  );
}

/* ── Data ── */

const metrics = [
  { icon: Users, label: "Total Students", value: "1,284", trend: "+12.5%", positive: true },
  { icon: Video, label: "Sessions This Week", value: "347", trend: "+8.2%", positive: true },
  { icon: TrendingUp, label: "Avg. Engagement", value: "74%", trend: "+3.1%", positive: true },
  { icon: Star, label: "Avg. Tutor Rating", value: "4.7", trend: "+0.2", positive: true },
];

const topStudents = [
  { initials: "JM", name: "James Mwangi", detail: "Mathematics · Form 4", progress: 92 },
  { initials: "AW", name: "Amina Wanjiku", detail: "Physics · Form 3", progress: 88 },
  { initials: "PK", name: "Peter Kamau", detail: "Biology · Form 4", progress: 85 },
  { initials: "FN", name: "Faith Nyambura", detail: "Chemistry · Form 3", progress: 79 },
  { initials: "DO", name: "David Ochieng", detail: "English · Form 2", progress: 74 },
];

const subjects = [
  { label: "Maths", value: 88 },
  { label: "Physics", value: 76 },
  { label: "Biology", value: 82 },
  { label: "Chemistry", value: 69 },
  { label: "English", value: 91 },
  { label: "History", value: 73 },
  { label: "Computer Science", value: 85 },
];

const activities = [
  { color: "#3730A3", text: "New tutor application approved — Dr. Susan Akinyi", time: "2 hours ago" },
  { color: "#059669", text: "Study session completed — Physics Group (12 students)", time: "4 hours ago" },
  { color: "#d97706", text: "Resource uploaded — 'Calculus Revision Notes.pdf'", time: "6 hours ago" },
  { color: "#dc2626", text: "Flagged content reviewed and resolved", time: "1 day ago" },
  { color: "#3730A3", text: "Monthly engagement report generated", time: "1 day ago" },
];

const announcements = [
  {
    title: "Mid-Term Break Schedule",
    body: "All sessions are suspended during the mid-term break from June 15–22. Please communicate this to your students.",
    date: "May 18, 2026",
    reach: "1,204 students",
  },
  {
    title: "New Biology Curriculum",
    body: "Updated Form 4 Biology content is now available. Review the new modules and assign them to your students.",
    date: "May 15, 2026",
    reach: "847 students",
  },
];

export default function InstitutionDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3730A3]/10">
            <GraduationCap className="h-6 w-6 text-[#3730A3]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Good afternoon, Kenyatta University
            </h2>
            <p className="text-sm text-gray-500">
              Here&apos;s what&apos;s happening across your institution today. You have{" "}
              <span className="font-medium text-[#3730A3]">3 pending requests</span> and{" "}
              <span className="font-medium text-[#3730A3]">2 active sessions</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Row 2 — Two cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Students */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Top Students by Activity
            </h3>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-3 divide-y divide-gray-50">
            {topStudents.map((s) => (
              <StudentRow key={s.name} {...s} />
            ))}
          </div>
        </div>

        {/* Subject Engagement */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Subject Engagement Breakdown
            </h3>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4 space-y-3.5">
            {subjects.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.label}</span>
                  <span className="font-medium text-gray-900">{s.value}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#3730A3] transition-all"
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — Two cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Activity
            </h3>
            <Bell className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-1 divide-y divide-gray-50">
            {activities.map((a, i) => (
              <ActivityItem key={i} {...a} />
            ))}
          </div>
        </div>

        {/* Announcements Sent */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Announcements Sent
            </h3>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4 space-y-3">
            {announcements.map((a) => (
              <div
                key={a.title}
                className="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
              >
                <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                <div className="mt-1 text-sm text-gray-500 line-clamp-2">{a.body}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {a.date}
                  </div>
                  <span>{a.reach} reached</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
              Subscription: Premium Plan
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
