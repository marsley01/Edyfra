"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Search, BookOpen, Video, File, Loader2 } from "lucide-react";

type ResourceItem = {
  id: string;
  title: string;
  type: string;
  subject: string;
  form: string;
  downloads: number;
  size: string;
  date: string;
};

const typeIcon: Record<string, typeof FileText> = {
  PDF: FileText,
  Video: Video,
  Interactive: BookOpen,
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionResources, getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const data = await getInstitutionResources(membership.institution.id);
          setResources(data as ResourceItem[]);
        }
      } catch {
        setResources([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
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
        <h2 className="text-lg font-semibold text-gray-900">Resources</h2>
        <p className="text-sm text-gray-500">{resources.length} resource{resources.length !== 1 ? "s" : ""} available.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {["all", "PDF", "Video", "Interactive"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-[#3730A3] text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No resources found</p>
          <p className="text-xs text-gray-400">
            {search ? "Try a different search term." : "No resources have been uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const Icon = typeIcon[r.type] || File;
            return (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3730A3]/10">
                    <Icon className="h-5 w-5 text-[#3730A3]" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {r.size}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{r.subject}</span>
                  <span>·</span>
                  <span>{r.form}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {r.downloads} download{r.downloads !== 1 ? "s" : ""}
                  </div>
                  <span>{r.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
