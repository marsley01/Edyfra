"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/lib/toast";
import { createCoachingFromRecommendations } from "@/app/actions/institution-manage";
import type { CoachingRecommendationReport } from "@/app/actions/institution-analytics";

/**
 * Shows algorithmic coaching matches (at-risk student × weak subject × teacher
 * with capacity) and lets the admin accept any subset in one click.
 */
export function CoachingRecommendations({ report }: { report: CoachingRecommendationReport }) {
  const router = useRouter();
  const keyOf = (r: { studentId: string; subject: string; teacherId: string }) => `${r.studentId}|${r.subject}|${r.teacherId}`;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(report.recommendations.map(keyOf)));
  const [pending, startTransition] = useTransition();
  const chosen = useMemo(() => report.recommendations.filter((r) => selected.has(keyOf(r))), [report.recommendations, selected]);

  function toggle(k: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function accept() {
    startTransition(async () => {
      const res = await createCoachingFromRecommendations({
        items: chosen.map((r) => ({ studentUserId: r.studentId, teacherUserId: r.teacherId, subject: r.subject })),
      });
      if (!res.ok) {
        showError({ title: "Couldn't create those assignments", cause: res.error, fix: "Refresh and try again." });
        return;
      }
      showSuccess(`${res.created} coaching assignment${res.created === 1 ? "" : "s"} created`, {
        description: res.skipped.length ? `${res.skipped.length} skipped (${res.skipped[0].reason.toLowerCase()}).` : undefined,
      });
      router.refresh();
    });
  }

  if (!report.focusLabel) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="h-4 w-4 text-primary" /> Recommended coaching · {report.focusLabel}
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              At-risk students matched to teachers of their weakest subjects (below 50%), highest risk first. Teachers
              take at most {report.capacity} active students; class match and value-added break ties.
            </p>
          </div>
          {report.recommendations.length > 0 && (
            <Button onClick={accept} disabled={pending || chosen.length === 0} className="bg-primary hover:bg-primary">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign {chosen.length} selected
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0 pb-4">
        {report.recommendations.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">
            No new matches. Either no student is at risk with a subject below 50%, or they are already being coached.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  {["", "Student", "Subject", "Score", "Teacher", "Why"].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.recommendations.map((r) => {
                  const k = keyOf(r);
                  return (
                    <tr key={k} className="border-b border-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(k)}
                          onChange={() => toggle(k)}
                          aria-label={`Select ${r.studentName} ${r.subject}`}
                          className="h-4 w-4 accent-[var(--primary)]"
                        />
                      </td>
                      <td className="px-4 py-2 font-bold text-gray-900">{r.studentName}</td>
                      <td className="px-4 py-2">{r.subject}</td>
                      <td className="px-4 py-2 font-black text-rose-600">{r.studentScore}%</td>
                      <td className="px-4 py-2 font-bold text-gray-900">{r.teacherName}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {report.unmatched.length > 0 && (
          <div className="mx-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700">
              <UserX className="h-3.5 w-3.5" /> {report.unmatched.length} need{report.unmatched.length === 1 ? "s" : ""} without a teacher
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-900">
              {report.unmatched.slice(0, 8).map((u) => (
                <li key={`${u.studentId}|${u.subject}`}>
                  {u.studentName} · {u.subject}: {u.reason.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.teacherLoad.length > 0 && (
          <div className="mx-4 flex flex-wrap gap-2">
            {report.teacherLoad.map((t) => (
              <span key={t.teacherId} className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
                {t.name}: {t.active} active{t.recommended ? ` + ${t.recommended} proposed` : ""} / {report.capacity}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
