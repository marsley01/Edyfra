"use client";

import { useState, useEffect } from "react";
import { Search, Star, MapPin, BookOpen, Clock, Loader2 } from "lucide-react";

type Tutor = {
  id: string;
  name: string;
  initials: string;
  email: string;
  subjects: string[];
  rating: number;
  totalSessions: number;
  location: string;
  status: "active" | "inactive";
};

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionTutors, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const data = await getInstitutionTutors(membership.institution.id);
          setTutors(data as Tutor[]);
        }
      } catch {
        setTutors([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = tutors.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
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
        <h2 className="text-lg font-semibold text-gray-900">Tutors</h2>
        <p className="text-sm text-gray-500">{tutors.length} tutor{tutors.length !== 1 ? "s" : ""} assigned.</p>
      </div>

      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tutors..."
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No tutors found</p>
          <p className="text-xs text-gray-400">
            {search ? "Try a different search term." : "No tutors are assigned yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tutor) => (
            <div key={tutor.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3730A3]/10 text-sm font-bold text-[#3730A3]">
                    {tutor.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{tutor.name}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {tutor.location}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    tutor.status === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tutor.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {tutor.subjects.map((sub) => (
                  <span key={sub} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                    <BookOpen className="h-3 w-3" />
                    {sub}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-gray-900">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {tutor.rating.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">{tutor.subjects.length}</div>
                  <div className="text-[10px] text-gray-400">Subjects</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900">
                    <Clock className="h-3 w-3" />
                    {tutor.totalSessions}
                  </div>
                  <div className="text-[10px] text-gray-400">Sessions</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
