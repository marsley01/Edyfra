"use client";

import { useState, useEffect } from "react";
import { Users, Search, Loader2 } from "lucide-react";

type Student = {
  id: string;
  name: string;
  initials: string;
  email: string;
  form: string;
  sessions: number;
  engagement: number;
  status: "active" | "inactive";
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionStudents, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const data = await getInstitutionStudents(membership.institution.id);
          setStudents(data as Student[]);
        }
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#3730A3]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <p className="text-sm text-gray-500">
          {students.length} student{students.length !== 1 ? "s" : ""} enrolled.
        </p>
      </div>

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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No students found</p>
          <p className="text-xs text-gray-400">
            {search ? "Try a different search term." : "No students are enrolled yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Form</th>
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
      )}
    </div>
  );
}
