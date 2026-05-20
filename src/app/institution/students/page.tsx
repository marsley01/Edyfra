"use client";

import { useState } from "react";
import { Users, Search, GraduationCap, BookOpen, MoreHorizontal, ChevronDown } from "lucide-react";

interface Student {
  id: number;
  name: string;
  initials: string;
  email: string;
  form: string;
  subjects: string[];
  sessions: number;
  engagement: number;
  status: "active" | "inactive";
}

const allStudents: Student[] = [
  { id: 1, name: "James Mwangi", initials: "JM", email: "james.mwangi@student.edu", form: "Form 4", subjects: ["Mathematics", "Physics", "Chemistry"], sessions: 28, engagement: 92, status: "active" },
  { id: 2, name: "Amina Wanjiku", initials: "AW", email: "amina.wanjiku@student.edu", form: "Form 3", subjects: ["Physics", "Biology"], sessions: 24, engagement: 88, status: "active" },
  { id: 3, name: "Peter Kamau", initials: "PK", email: "peter.kamau@student.edu", form: "Form 4", subjects: ["Biology", "Mathematics"], sessions: 21, engagement: 85, status: "active" },
  { id: 4, name: "Faith Nyambura", initials: "FN", email: "faith.nyambura@student.edu", form: "Form 3", subjects: ["Chemistry", "English"], sessions: 18, engagement: 79, status: "active" },
  { id: 5, name: "David Ochieng", initials: "DO", email: "david.ochieng@student.edu", form: "Form 2", subjects: ["English", "History"], sessions: 16, engagement: 74, status: "active" },
  { id: 6, name: "Sarah Akinyi", initials: "SA", email: "sarah.akinyi@student.edu", form: "Form 4", subjects: ["Mathematics", "Computer Science"], sessions: 30, engagement: 96, status: "active" },
  { id: 7, name: "Kevin Njenga", initials: "KN", email: "kevin.njenga@student.edu", form: "Form 1", subjects: ["Mathematics", "English"], sessions: 10, engagement: 62, status: "inactive" },
  { id: 8, name: "Grace Wambui", initials: "GW", email: "grace.wambui@student.edu", form: "Form 3", subjects: ["Biology", "Chemistry", "Physics"], sessions: 22, engagement: 81, status: "active" },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = allStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <p className="text-sm text-gray-500">
          {allStudents.length} students enrolled across your institution.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[#3730A3] text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Student</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Form</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Subjects</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Sessions</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Engagement</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3730A3]/10 text-xs font-bold text-[#3730A3]">
                      {s.initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{s.form}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {s.subjects.map((sub) => (
                      <span key={sub} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {sub}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{s.sessions}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#3730A3]"
                        style={{ width: `${s.engagement}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{s.engagement}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      s.status === "active"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
