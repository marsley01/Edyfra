// Server components for the results page: at-risk list and value-added tables.
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtRiskPage, ValueAddedReport } from "@/app/actions/institution-analytics";

type Params = Record<string, string | undefined>;

function href(base: string, params: Params, patch: Params, hash?: string) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) sp.set(k, v);
  const qs = sp.toString();
  return `${base}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

const LEVEL_STYLE = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-gray-100 text-gray-600 ring-gray-200",
} as const;

export function AtRiskPanel({ data, basePath, params }: { data: AtRiskPage; basePath: string; params: Params }) {
  if (!data.focusLabel) return null;
  const level = params.risk ?? "ALL";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const w = data.weights;
  return (
    <Card id="at-risk">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-black">
          <AlertTriangle className="h-4 w-4 text-rose-500" /> At-risk students · {data.focusLabel}
        </CardTitle>
        <p className="text-xs text-gray-500">
          Risk = 100 × ({w.decline} × falling trend + {w.belowMean} × distance below class mean (beyond 1 SD) + {w.missing} ×
          missed assessments + {w.inactivity} × platform inactivity). Trend is a least-squares slope over the last 6 terms and needs at
          least 3. High ≥ {data.thresholds.high}, medium ≥ {data.thresholds.medium}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {(
            [
              ["ALL", `High + medium (${data.counts.HIGH + data.counts.MEDIUM})`],
              ["HIGH", `High (${data.counts.HIGH})`],
              ["MEDIUM", `Medium (${data.counts.MEDIUM})`],
              ["LOW", `Low (${data.counts.LOW})`],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={href(basePath, params, { risk: key === "ALL" ? undefined : key, riskPage: undefined }, "at-risk")}
              scroll={false}
              className={`rounded-full px-3 py-1 font-bold ring-1 ${
                level === key ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-600 ring-gray-200 hover:ring-gray-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No students in this band.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.rows.map((r) => (
              <li key={r.studentId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/institution/dashboard/students/${r.studentId}`} className="font-bold text-gray-900 hover:text-primary">
                      {r.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {r.className}
                      {r.stream ? ` ${r.stream}` : ""}
                      {r.admissionNumber ? ` · ${r.admissionNumber}` : ""}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                    {r.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                  {r.weakSubjects.length > 0 && (
                    <p className="mt-1 text-xs text-rose-600">
                      Weak: {r.weakSubjects.map((s) => `${s.subject} ${s.score}`).join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-black ring-1 ${LEVEL_STYLE[r.level]}`}>
                    {r.score}
                  </span>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {r.latestMean != null ? `Mean ${r.latestMean}` : "Not assessed this term"}
                    {r.slope != null ? ` · ${r.slope > 0 ? "+" : ""}${r.slope}/term` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            {data.page > 1 ? (
              <Link href={href(basePath, params, { riskPage: String(data.page - 1) }, "at-risk")} scroll={false} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <ChevronLeft className="h-4 w-4 opacity-30" />
            )}
            <span className="tabular-nums">
              {data.page}/{pages}
            </span>
            {data.page < pages ? (
              <Link href={href(basePath, params, { riskPage: String(data.page + 1) }, "at-risk")} scroll={false} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <ChevronRight className="h-4 w-4 opacity-30" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ValueAddedPanel({ data }: { data: ValueAddedReport }) {
  if (!data.focusLabel) return null;
  if (!data.priorLabel || data.recordsWithPrior === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-500">
          <p className="flex items-center gap-2 font-bold text-gray-900">
            <Scale className="h-4 w-4 text-gray-400" /> Subject difficulty &amp; teacher value-added
          </p>
          <p className="mt-1">Needs results for two consecutive terms: each student&apos;s previous-term mean is the baseline.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black">Subject difficulty · {data.focusLabel}</CardTitle>
          <p className="text-xs text-gray-500">
            Each mark is compared with what the student&apos;s {data.priorLabel} mean predicts (least-squares fit across the school).
            Residual = actual − expected; difficulty z standardises the subject&apos;s mean residual (higher = harder). Subjects need ≥ 5
            entries.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {data.subjects.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-500">Not enough matched entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  {["Subject", "Raw mean", "Residual", "z", ""].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject} className="border-b border-gray-50">
                    <td className="px-4 py-2 font-bold text-gray-900">
                      {s.subject} <span className="text-[11px] font-medium text-gray-400">n={s.n}</span>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{s.rawMean}</td>
                    <td className={`px-4 py-2 tabular-nums ${s.meanResidual < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {s.meanResidual > 0 ? "+" : ""}
                      {s.meanResidual}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{s.difficultyZ ?? "—"}</td>
                    <td className="px-4 py-2">
                      {s.label !== "TYPICAL" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            s.label === "HARDER" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {s.label.toLowerCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black">Teacher value-added · {data.focusLabel}</CardTitle>
          <p className="text-xs text-gray-500">
            Mean residual of the marks a teacher&apos;s classes earned, after removing prior attainment and subject difficulty
            (marks above/below expectation). Teachers need ≥ 5 entries; &ldquo;clear&rdquo; means |value-added / standard error| ≥ 2. Based on
            subject assignments in Teachers.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {data.teachers.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-500">
              No teacher has enough attributed entries. Assign subjects (and forms) to teachers to enable this.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  {["Teacher", "Entries", "Value-added", "± SE", "z"].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.teachers.map((t) => (
                  <tr key={t.teacherId} className="border-b border-gray-50">
                    <td className="px-4 py-2 font-bold text-gray-900">
                      {t.name}
                      {t.significant && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-600">clear</span>
                      )}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{t.n}</td>
                    <td className={`px-4 py-2 font-black tabular-nums ${t.valueAdded < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {t.valueAdded > 0 ? "+" : ""}
                      {t.valueAdded}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-gray-500">{t.standardError ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{t.effectivenessZ ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
