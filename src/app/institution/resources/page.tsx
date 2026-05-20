"use client";

import { useState } from "react";
import { FileText, Download, Search, BookOpen, Video, File, Filter } from "lucide-react";

const resources = [
  { id: 1, title: "Calculus Revision Notes.pdf", type: "PDF", subject: "Mathematics", form: "Form 4", downloads: 234, size: "2.4 MB", date: "May 12, 2026" },
  { id: 2, title: "Photo Synthesis — Complete Guide", type: "PDF", subject: "Biology", form: "Form 3", downloads: 189, size: "3.1 MB", date: "May 10, 2026" },
  { id: 3, title: "Newton's Laws — Video Lesson", type: "Video", subject: "Physics", form: "Form 4", downloads: 312, size: "45 MB", date: "May 8, 2026" },
  { id: 4, title: "Periodic Table Flashcards", type: "Interactive", subject: "Chemistry", form: "Form 2", downloads: 167, size: "1.8 MB", date: "May 5, 2026" },
  { id: 5, title: "KCSE Past Papers 2025", type: "PDF", subject: "All Subjects", form: "Form 4", downloads: 891, size: "12.5 MB", date: "Apr 30, 2026" },
  { id: 6, title: "Essay Writing Techniques", type: "PDF", subject: "English", form: "Form 3", downloads: 203, size: "1.2 MB", date: "Apr 28, 2026" },
];

const typeIcon: Record<string, typeof FileText> = {
  PDF: FileText,
  Video: Video,
  Interactive: BookOpen,
};

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Resources</h2>
        <p className="text-sm text-gray-500">Educational materials shared across your institution.</p>
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
                  {r.downloads} downloads
                </div>
                <span>{r.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
