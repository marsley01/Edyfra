"use client";

import { FileText, Download, ArrowUpRight, Calendar } from "lucide-react";

const reports = [
  {
    id: 1,
    title: "Monthly Engagement Report",
    period: "April 2026",
    generated: "May 1, 2026",
    type: "PDF",
    pages: 12,
    metrics: { students: 1248, sessions: 1423, engagement: "74%" },
    trend: "+8.3%",
  },
  {
    id: 2,
    title: "Academic Performance Summary",
    period: "Term 1, 2026",
    generated: "Apr 15, 2026",
    type: "PDF",
    pages: 8,
    metrics: { students: 1184, avgScore: "76%", topSubject: "Mathematics" },
    trend: "+4.1%",
  },
  {
    id: 3,
    title: "Tutor Effectiveness Report",
    period: "Q1 2026",
    generated: "Apr 10, 2026",
    type: "PDF",
    pages: 6,
    metrics: { tutors: 18, avgRating: 4.7, retentionRate: "92%" },
    trend: "+2.5%",
  },
  {
    id: 4,
    title: "Resource Utilization Analysis",
    period: "April 2026",
    generated: "May 2, 2026",
    type: "PDF",
    pages: 10,
    metrics: { resources: 156, downloads: 3421, topSubject: "Mathematics" },
    trend: "+15.2%",
  },
  {
    id: 5,
    title: "Student Attendance Overview",
    period: "April 2026",
    generated: "May 1, 2026",
    type: "PDF",
    pages: 5,
    metrics: { avgAttendance: "87%", totalClasses: 89, missedClasses: 12 },
    trend: "+1.8%",
  },
];

const categories = ["All", "Engagement", "Performance", "Tutors", "Resources", "Attendance"];
const [activeCategory, setActiveCategory] = useState("All");

import { useState } from "react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Generate and download detailed reports for your institution.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3730A3]/90">
          <FileText className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-[#3730A3] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {r.period}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#3730A3]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#3730A3]">
                <ArrowUpRight className="h-3 w-3" />
                {r.trend}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
              {Object.entries(r.metrics).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div className="text-sm font-bold text-gray-900">{val}</div>
                  <div className="text-[10px] text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
              <span>
                {r.type} · {r.pages} pages · {r.generated}
              </span>
              <button className="inline-flex items-center gap-1 font-medium text-[#3730A3] hover:underline">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
