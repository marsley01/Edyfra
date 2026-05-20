"use client";

import { useState } from "react";
import { Video, Clock, Users, Search, Play, CheckCircle2, XCircle } from "lucide-react";

const sessions = [
  { id: 1, title: "Form 4 Mathematics — Calculus Review", tutor: "Dr. Susan Akinyi", date: "May 20, 2026", time: "14:00 - 15:30", students: 18, status: "completed" },
  { id: 2, title: "Form 3 Physics — Newton's Laws", tutor: "John Kiprop", date: "May 20, 2026", time: "16:00 - 17:00", students: 12, status: "live" },
  { id: 3, title: "Form 4 Biology — Genetics", tutor: "Mary Wanjiku", date: "May 21, 2026", time: "10:00 - 11:30", students: 15, status: "scheduled" },
  { id: 4, title: "Form 2 Chemistry — Atomic Structure", tutor: "Grace Chebet", date: "May 21, 2026", time: "14:00 - 15:00", students: 10, status: "scheduled" },
  { id: 5, title: "Form 4 English — Literature Review", tutor: "Peter Omondi", date: "May 19, 2026", time: "11:00 - 12:30", students: 20, status: "completed" },
  { id: 6, title: "Form 3 Mathematics — Trigonometry", tutor: "Dr. Susan Akinyi", date: "May 22, 2026", time: "09:00 - 10:30", students: 14, status: "scheduled" },
];

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600",
  live: "bg-red-50 text-red-600",
  scheduled: "bg-blue-50 text-blue-600",
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  live: Play,
  scheduled: Clock,
};

export default function SessionsPage() {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.tutor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
        <p className="text-sm text-gray-500">Upcoming and past study sessions across your institution.</p>
      </div>

      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions..."
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((s) => {
          const StatusIcon = statusIcons[s.status] || Clock;
          return (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#3730A3]" />
                    <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>{s.tutor}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {s.date} · {s.time}
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {s.students} students
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${statusStyles[s.status]}`}>
                  <StatusIcon className="h-3 w-3" />
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
