"use client";

import { useState, useEffect } from "react";
import { Video, Clock, Users, Search, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type SessionItem = {
  id: string;
  title: string;
  tutor: string;
  date: string;
  time: string;
  students: number;
  status: string;
};

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600",
  active: "bg-red-50 text-red-600",
  pending: "bg-blue-50 text-blue-600",
  cancelled: "bg-gray-100 text-gray-500",
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  active: Play,
  pending: Clock,
  cancelled: XCircle,
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionSessions, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const data = await getInstitutionSessions(membership.institution.id);
          setSessions(data as SessionItem[]);
        }
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.tutor.toLowerCase().includes(search.toLowerCase())
  );

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
        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
        <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""} across your institution.</p>
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Video className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No sessions found</p>
          <p className="text-xs text-gray-400">
            {search ? "Try a different search term." : "No sessions have been conducted yet."}
          </p>
        </div>
      ) : (
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
                        {s.students} student{s.students !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${statusStyles[s.status] || "bg-gray-100 text-gray-500"}`}>
                    <StatusIcon className="h-3 w-3" />
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
