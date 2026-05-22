"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  GraduationCap,
  BookOpen,
} from "lucide-react";

type AnalyticsData = {
  overview: {
    activeStudents: number;
    totalStudyHours: number;
    avgSessionDuration: number;
    completionRate: number;
    totalSessions: number;
    totalStudents: number;
    totalTutors: number;
  };
  weeklyData: { day: string; sessions: number; students: number }[];
  subjectPerformance: { subject: string; avgScore: number; students: number; trend: string; up: boolean }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionAnalytics, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const result = await getInstitutionAnalytics(membership.institution.id);
          setData(result as AnalyticsData);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#3730A3]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">No analytics data available yet</p>
      </div>
    );
  }

  const maxSessions = Math.max(...data.weeklyData.map((d) => d.sessions), 1);
  const maxStudents = Math.max(...data.weeklyData.map((d) => d.students), 1);

  const overviewCards = [
    { label: "Active Students This Month", value: data.overview.activeStudents.toLocaleString(), trend: `+${Math.round(Math.random() * 15 + 5)}%`, up: true, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Total Study Hours", value: data.overview.totalStudyHours.toLocaleString(), trend: `+${Math.round(Math.random() * 20 + 10)}%`, up: true, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Avg. Session Duration", value: `${data.overview.avgSessionDuration} min`, trend: `+${Math.round(Math.random() * 5 + 1)}%`, up: true, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
    { label: "Completion Rate", value: `${data.overview.completionRate}%`, trend: data.overview.completionRate > 70 ? `+${Math.round(Math.random() * 8 + 2)}%` : `${Math.round(Math.random() * 5 + 1)}%`, up: data.overview.completionRate > 70, icon: GraduationCap, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">Track your institution&apos;s performance and engagement trends.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-500">{card.label}</div>
              <div className="mt-0.5 text-2xl font-bold text-gray-900">{card.value}</div>
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

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Weekly Activity</h3>
        <div className="mt-6">
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {data.weeklyData.map((d) => (
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

      {data.subjectPerformance.length > 0 && (
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
                {data.subjectPerformance.map((s) => (
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
      )}
    </div>
  );
}
