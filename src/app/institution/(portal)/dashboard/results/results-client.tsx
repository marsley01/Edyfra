"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, FileSpreadsheet, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvUpload } from "@/components/institution/csv-upload";
import { SubjectBarChart } from "@/components/institution/charts/subject-bar-chart";
import { showError, showSuccess } from "@/lib/toast";
import {
  parseResultsCsv,
  suggestMapping,
  validateResultsRows,
  type ColumnMapping,
  type ParsedCsv,
  type ValidationResult,
} from "@/app/actions/institution-results-helpers";
import { importStudentResults } from "@/app/actions/institution-results";

interface Summary {
  subjectAverages: { subject: string; average: number; students: number }[];
  classDistribution: { subject: string; CRITICAL: number; AT_RISK: number; MONITORING: number; ON_TRACK: number; EXCELLENT: number }[];
  mostImproved: { studentUserId: string; name: string; currentAvg: number; lastAvg: number; improvement: number }[];
  strugglingSubjects: { subject: string; struggling: number }[];
  formComparison: { form: string; average: number }[];
}

export function ResultsClient({
  initialSummary,
  currentTerm,
}: {
  initialSummary: Summary;
  currentTerm: { term: number; year: number } | null;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [showUpload, setShowUpload] = useState(false);
  const [term, setTerm] = useState(currentTerm?.term ?? 1);
  const [year, setYear] = useState(currentTerm?.year ?? new Date().getFullYear());

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Insights</p>
          <h1 className="text-2xl font-black text-gray-900">Results &amp; Analysis</h1>
          <p className="text-sm text-gray-500">
            Upload end-of-term results to see school-wide performance, trends, and AI insights.
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Upload className="mr-2 h-4 w-4" /> Upload results CSV
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Subject averages</CardTitle>
            <p className="text-xs text-gray-500">Across all uploaded terms.</p>
          </CardHeader>
          <CardContent>
            <SubjectBarChart
              data={summary.subjectAverages.map((s) => ({ name: s.subject, average: s.average }))}
              series={[{ name: "Average", dataKey: "average", color: "#3730A3" }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Form comparison</CardTitle>
            <p className="text-xs text-gray-500">Which form is performing best?</p>
          </CardHeader>
          <CardContent>
            <SubjectBarChart
              data={summary.formComparison.map((f) => ({ name: f.form, average: f.average }))}
              series={[{ name: "Average", dataKey: "average", color: "#06B6D4" }]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Top 10 most improved students</CardTitle>
            <p className="text-xs text-gray-500">Biggest jump from last term to this term.</p>
          </CardHeader>
          <CardContent className="p-0">
            {summary.mostImproved.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Upload last term's data to see improvements.</p>
            ) : (
              <ol className="divide-y divide-gray-100">
                {summary.mostImproved.map((s, i) => (
                  <li
                    key={s.studentUserId}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
                        {i + 1}
                      </span>
                      <p className="font-bold text-gray-900">{s.name}</p>
                    </div>
                    <p className="text-sm">
                      <span className="font-black text-emerald-600">+{s.improvement.toFixed(1)}%</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {s.lastAvg.toFixed(0)} → {s.currentAvg.toFixed(0)}
                      </span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Subjects with most struggling students</CardTitle>
            <p className="text-xs text-gray-500">Below 50% — needs focused support.</p>
          </CardHeader>
          <CardContent className="p-0">
            {summary.strugglingSubjects.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No students are below 50% — great work!</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.strugglingSubjects.slice(0, 8).map((s) => (
                  <li key={s.subject} className="flex items-center justify-between px-5 py-3">
                    <p className="font-bold text-gray-900">{s.subject}</p>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700">
                      {s.struggling} struggling
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black">Class distribution by subject</CardTitle>
          <p className="text-xs text-gray-500">How many students fall in each flag band per subject.</p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                {["Subject", "Critical", "At risk", "Monitor", "On track", "Excellent"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.classDistribution.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                    No results uploaded yet.
                  </td>
                </tr>
              ) : (
                summary.classDistribution.map((row) => (
                  <tr key={row.subject} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-900">{row.subject}</td>
                    <DistCell value={row.CRITICAL} tone="rose" />
                    <DistCell value={row.AT_RISK} tone="orange" />
                    <DistCell value={row.MONITORING} tone="amber" />
                    <DistCell value={row.ON_TRACK} tone="emerald" />
                    <DistCell value={row.EXCELLENT} tone="cyan" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          term={term}
          year={year}
          setTerm={setTerm}
          setYear={setYear}
          onImported={() => {
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function DistCell({ value, tone }: { value: number; tone: "rose" | "orange" | "amber" | "emerald" | "cyan" }) {
  const TONE: Record<typeof tone, string> = {
    rose: "bg-rose-50 text-rose-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
  };
  return (
    <td className="px-5 py-3">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black ${TONE[tone]}`}>
        {value}
      </span>
    </td>
  );
}

function UploadDialog({
  onClose,
  term,
  year,
  setTerm,
  setYear,
  onImported,
}: {
  onClose: () => void;
  term: number;
  year: number;
  setTerm: (n: number) => void;
  setYear: (n: number) => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    admissionNumber: null, studentName: null, subject: null, marks: null,
    grade: null, term: null, year: null, form: null,
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(text: string) {
    const result = await parseResultsCsv(text);
    if (result.error) {
      showError({
        title: "We couldn't read that file",
        cause: result.error,
        fix: "Check the CSV format and try again.",
      });
      return;
    }
    setParsed(result);
    setMapping(suggestMapping(result.columns));
    setStep("map");
  }

  function handleValidate() {
    if (!parsed) return;
    const required: (keyof ColumnMapping)[] = [
      "admissionNumber", "studentName", "subject", "marks", "term", "year", "form",
    ];
    for (const r of required) {
      if (!mapping[r]) {
        showError({
          title: `Map the "${r}" column before continuing`,
          cause: "That column is required to import the file.",
          fix: "Pick a column from the dropdown for it.",
        });
        return;
      }
    }
    const result = validateResultsRows(parsed.rows, mapping);
    setValidation(result);
    setStep("preview");
  }

  async function handleImport() {
    if (!parsed || !validation) return;
    setImporting(true);
    const fullValidation = validateResultsRows(parsed.rows, mapping);
    const res = await importStudentResults({
      term,
      year,
      rows: fullValidation.allValid,
    });
    setImporting(false);
    if (!res.ok) {
      showError({
        title: "We couldn't import those results",
        cause: res.error,
        fix: "Fix the rows highlighted in the preview, then try again.",
      });
      return;
    }
    showSuccess(`Imported ${res.inserted} result rows`, { description: "Results are now in the system." });
    setStep("done");
    onImported();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
              Upload results
            </h2>
            <p className="text-xs text-gray-500">Upload, map columns, validate, then import.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-100 bg-gray-50/60 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Term">
              <select
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    Term {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {step === "upload" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                CSV should have these columns (in any order — you'll map them next):{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  admission_number, student_name, subject, marks, grade, term, year, form
                </code>
              </p>
              <CsvUpload onParsed={handleFile} />
            </div>
          )}

          {step === "map" && parsed && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                We auto-detected the columns below. Adjust if any are wrong.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["admissionNumber", "Admission #"],
                    ["studentName", "Student name"],
                    ["subject", "Subject"],
                    ["marks", "Marks (0-100)"],
                    ["grade", "Grade (optional)"],
                    ["term", "Term"],
                    ["year", "Year"],
                    ["form", "Form / Class"],
                  ] as [keyof ColumnMapping, string][]
                ).map(([key, label]) => (
                  <Field key={key} label={label} required={key !== "grade"}>
                    <select
                      value={mapping[key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || null })}
                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="">— not mapped —</option>
                      {parsed.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && validation && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validation.validCount} valid
                </span>
                {validation.invalidCount > 0 && (
                  <span className="rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-700">
                    {validation.invalidCount} invalid
                  </span>
                )}
              </div>
              {validation.issues.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs">
                  <p className="font-black uppercase tracking-widest text-rose-700">First issues</p>
                  <ul className="mt-1 space-y-0.5 text-rose-900">
                    {validation.issues.slice(0, 10).map((i, idx) => (
                      <li key={idx}>
                        Row {i.row}: {i.field} — {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      {["Admission", "Name", "Subject", "Marks", "Grade", "Form"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.preview.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-3 py-2">{r.admissionNumber}</td>
                        <td className="px-3 py-2">{r.studentName}</td>
                        <td className="px-3 py-2">{r.subject}</td>
                        <td className="px-3 py-2 font-black">{r.marks}</td>
                        <td className="px-3 py-2">{r.grade ?? "—"}</td>
                        <td className="px-3 py-2">{r.form}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-base font-black text-gray-900">Import complete</p>
              <p className="text-sm text-gray-500">
                You can now generate per-student AI insights and view trends.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-gray-100 p-5">
          <Button variant="ghost" onClick={onClose}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          <div>
            {step === "map" && (
              <Button onClick={handleValidate} className="bg-indigo-600 hover:bg-indigo-700">
                Validate <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === "preview" && (
              <Button
                onClick={handleImport}
                disabled={importing || validation?.validCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {importing ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Import {validation?.validCount} rows
              </Button>
            )}
            {step === "upload" && (
              <Button disabled className="bg-indigo-600 hover:bg-indigo-700">
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Choose a CSV first
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-gray-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    />
  );
}
