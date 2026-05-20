"use client";

import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const overviewCards = [
  { label: "Active Students This Month", value: "847", trend: "+14.2%", up: true },
  { label: "Total Study Hours", value: "2,341", trend: "+22.7%", up: true },
  { label: "Avg. Session Duration", value: "47 min", trend: "+3.1%", up: true },
  { label: "Drop-off Rate", value: "11.3%", trend: "-2.4%", up: false },
];

const weeklyData = [
  { day: "Mon", sessions: 48, students: 124 },
  { day: "Tue", sessions: 62, students: 156 },
  { day: "Wed", sessions: 55, students: 143 },
  { day: "Thu", sessions: 71, students: 178 },
  { day: "Fri", sessions: 43, students: 112 },
  { day: "Sat", sessions: 38, students: 89 },
  { day: "Sun", sessions: 30, students: 67 },
];

const maxSessions = Math.max(...weeklyData.map((d) => d.sessions));
const maxStudents = Math.max(...weeklyData.map((d) => d.students));

const subjectPerformance = [
  { subject: "Mathematics", avgScore: 78, students: 312, trend: "+5%", up: true },
  { subject: "Physics", avgScore: 72, students: 198, trend: "+3%", up: true },
  { subject: "Biology", avgScore: 81, students: 245, trend: "+7%", up: true },
  { subject: "Chemistry", avgScore: 69, students: 167, trend: "-2%", up: false },
  { subject: "English", avgScore: 85, students: 290, trend: "+4%", up: true },
  { subject: "History", avgScore: 76, students: 134, trend: "+1%", up: true },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">Track your institution&apos;s performance and engagement trends.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-medium text-gray-500">{card.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{card.value}</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-medium">
              {card.up ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={card.up ? "text-emerald-600" : "text-red-600"}>{card.trend}</span>
              <span className="text-gray-400">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Weekly Activity</h3>
        <div className="mt-6">
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {weeklyData.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full items-end justify-center gap-1" style={{ height: 140 }}>
                  <div
                    className="w-3 rounded-t-sm bg-[#3730A3]/60 transition-all"
                    style={{ height: `${(d.students / maxStudents) * 100}%` }}
                  />
                  <div
                    className="w-3 rounded-t-sm bg-[#3730A3] transition-all"
                    style={{ height: `${(d.sessions / maxSessions) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-sm bg-[#3730A3]" />
              Sessions
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-sm bg-[#3730A3]/60" />
              Students
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Subject Performance</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3 pr-4">Avg. Score</th>
                <th className="pb-3 pr-4">Students</th>
                <th className="pb-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {subjectPerformance.map((s) => (
                <tr key={s.subject} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-gray-900">{s.subject}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#3730A3]"
                          style={{ width: `${s.avgScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{s.avgScore}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{s.students}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${s.up ? "text-emerald-600" : "text-red-600"}`}>
                      {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {s.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
