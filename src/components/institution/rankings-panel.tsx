"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/lib/toast";
import { exportClassResultsCsv, getStudentTermMarks, type RankingPage } from "@/app/actions/institution-analytics";
import { deleteStudentMark, upsertStudentMark } from "@/app/actions/institution-manage";

/**
 * Class/stream rankings for one term with competition ranking, filters and
 * pagination driven by URL params (?class=&stream=&q=&page=), CSV export and a
 * per-student mark editor.
 */
export function RankingsPanel({ institutionId, data }: { institutionId: string; data: RankingPage }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [navPending, startNav] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const className = params.get("class") ?? "";
  const stream = params.get("stream") ?? "";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const streams = data.classes.find((c) => c.className === className)?.streams ?? [];

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startNav(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportClassResultsCsv(institutionId, {
        term: data.focus,
        className: className || null,
        stream: stream || null,
      });
      if (!res.ok) {
        showError({ title: "Nothing to export", cause: res.error, fix: "Pick another class or term." });
        return;
      }
      // BOM so Excel opens UTF-8 names correctly.
      const blob = new Blob(["﻿", res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError({ title: "Export failed", cause: "The server didn't respond.", fix: "Try again in a moment." });
    } finally {
      setExporting(false);
    }
  }

  if (!data.focus) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-gray-500">
          Rankings appear once results are uploaded for a term.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black">Class rankings · {data.focusLabel}</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Positions by mean score with standard competition ranking (ties share a position, the next is skipped).
              Mean grade uses KCSE points (A = 12 … E = 1). Click a student to correct a mark.
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={className}
            onChange={(e) => setParams({ class: e.target.value || null, stream: null, page: null })}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
            aria-label="Class"
          >
            <option value="">All classes</option>
            {data.classes.map((c) => (
              <option key={c.className} value={c.className}>
                {c.className} ({c.students})
              </option>
            ))}
          </select>
          {streams.length > 0 && (
            <select
              value={stream}
              onChange={(e) => setParams({ stream: e.target.value || null, page: null })}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
              aria-label="Stream"
            >
              <option value="">All streams</option>
              {streams.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ q: q.trim() || null, page: null });
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or admission no."
              className="h-9 w-56 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm"
            />
          </form>
          {navPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No students match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  {["Pos", "Class pos", "Stream pos", "Student", "Class", ...data.subjects, "Mean", "Grade", "Pctl", ""].map((h, i) => (
                    <th key={`${h}-${i}`} className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.studentId}
                    className="cursor-pointer border-b border-gray-50 hover:bg-gray-50/60"
                    onClick={() => setEditing({ id: r.studentId, name: r.name })}
                  >
                    <td className="px-3 py-2 font-black tabular-nums">{r.overallRank}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">
                      {r.classRank}/{r.classOf}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{r.streamRank != null ? `${r.streamRank}/${r.streamOf}` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <p className="font-bold text-gray-900">{r.name}</p>
                      {r.admissionNumber && <p className="text-[11px] text-gray-500">{r.admissionNumber}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {r.className}
                      {r.stream ? ` ${r.stream}` : ""}
                    </td>
                    {data.subjects.map((s) => (
                      <td key={s} className={`px-3 py-2 tabular-nums ${(r.subjectMarks[s] ?? 100) < 40 ? "text-rose-600" : "text-gray-700"}`}>
                        {r.subjectMarks[s] ?? "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 font-black tabular-nums">{r.mean}</td>
                    <td className="px-3 py-2 font-bold">
                      {r.meanGrade} <span className="text-[11px] font-medium text-gray-400">{r.meanPoints.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{r.percentile}</td>
                    <td className="px-3 py-2 text-right">
                      <Pencil className="inline h-3.5 w-3.5 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span>
            {data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1}–{Math.min(data.total, data.page * data.pageSize)} of {data.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={data.page <= 1 || navPending}
              onClick={() => setParams({ page: String(data.page - 1) })}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {data.page}/{pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={data.page >= pages || navPending}
              onClick={() => setParams({ page: String(data.page + 1) })}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {editing && data.focus && (
        <MarkEditor
          institutionId={institutionId}
          student={editing}
          term={data.focus}
          subjects={data.subjects}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </Card>
  );
}

function MarkEditor({
  institutionId,
  student,
  term,
  subjects,
  onClose,
  onSaved,
}: {
  institutionId: string;
  student: { id: string; name: string };
  term: { term: number; year: number };
  subjects: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [marks, setMarks] = useState<{ id: string; subject: string; marks: number; grade: string | null }[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newSubject, setNewSubject] = useState("");
  const [newMarks, setNewMarks] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    try {
      const rows = await getStudentTermMarks(institutionId, student.id, term);
      setMarks(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.id, String(r.marks)])));
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, term.term, term.year]);

  async function save(subject: string, value: string, key: string) {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      showError({ title: "Marks must be between 0 and 100", cause: `"${value}" is not a valid mark.`, fix: "Enter a number from 0 to 100." });
      return;
    }
    setBusy(key);
    const res = await upsertStudentMark({ studentUserId: student.id, subject, marks: n, term: term.term, year: term.year });
    setBusy(null);
    if (!res.ok) {
      showError({ title: "Couldn't save that mark", cause: res.error, fix: "Try again." });
      return;
    }
    showSuccess(res.created ? `${subject} added` : `${subject} updated`);
    if (key === "new") {
      setNewSubject("");
      setNewMarks("");
    }
    await load();
    onSaved();
  }

  async function remove(id: string, subject: string) {
    if (!confirm(`Remove ${subject} for ${student.name}?`)) return;
    setBusy(id);
    const res = await deleteStudentMark(id);
    setBusy(null);
    if (!res.ok) {
      showError({ title: "Couldn't remove that mark", cause: res.error, fix: "Refresh and try again." });
      return;
    }
    await load();
    onSaved();
  }

  const missing = subjects.filter((s) => !marks?.some((m) => m.subject.toLowerCase() === s.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">{student.name}</h2>
            <p className="text-xs text-gray-500">
              Term {term.term} {term.year} marks. Changes recompute grades, flags and rankings.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {loadError ? (
          <p className="text-sm text-rose-600">Couldn&apos;t load marks. Close and try again.</p>
        ) : !marks ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="space-y-2">
            {marks.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-32 truncate text-sm font-bold text-gray-900">{m.subject}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={drafts[m.id] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [m.id]: e.target.value })}
                  className="h-9 w-20 rounded-md border border-gray-200 px-2 text-sm tabular-nums"
                />
                <Button
                  size="sm"
                  disabled={busy !== null || drafts[m.id] === String(m.marks)}
                  onClick={() => save(m.subject, drafts[m.id] ?? "", m.id)}
                >
                  {busy === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
                <button
                  onClick={() => remove(m.id, m.subject)}
                  disabled={busy !== null}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Remove ${m.subject}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
              <input
                list="mark-editor-subjects"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Add subject"
                className="h-9 w-32 rounded-md border border-gray-200 px-2 text-sm"
              />
              <datalist id="mark-editor-subjects">
                {missing.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={newMarks}
                onChange={(e) => setNewMarks(e.target.value)}
                placeholder="0-100"
                className="h-9 w-20 rounded-md border border-gray-200 px-2 text-sm"
              />
              <Button size="sm" variant="outline" disabled={busy !== null || !newSubject.trim()} onClick={() => save(newSubject.trim(), newMarks, "new")}>
                {busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
