"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceBadge } from "@/components/institution/performance-badge";

interface SubjectAvg {
  subject: string;
  average: number;
  students: number;
}
interface Distribution {
  subject: string;
  CRITICAL: number;
  AT_RISK: number;
  MONITORING: number;
  ON_TRACK: number;
  EXCELLENT: number;
}
interface MostImproved {
  studentUserId: string;
  name: string;
  currentAvg: number;
  lastAvg: number;
  improvement: number;
}

export function ReportsClient({
  schoolName,
  summary,
  students,
  termName,
}: {
  schoolName: string;
  summary: {
    subjectAverages: SubjectAvg[];
    classDistribution: Distribution[];
    mostImproved: MostImproved[];
    strugglingSubjects: { subject: string; struggling: number }[];
  };
  students: { id: string; name: string; average: number; flag: "RED" | "YELLOW" | "GREEN" }[];
  termName: string;
}) {
  const [busy, setBusy] = useState<null | "pdf" | "csv-students" | "csv-subjects" | "csv-distribution" | "csv-improved">(null);

  function handleBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportStudentsCsv() {
    setBusy("csv-students");
    const header = ["Name", "Average", "Overall status"];
    const rows = students.map((s) => [s.name, s.average.toFixed(1), s.flag]);
    handleBlob(toCsv([header, ...rows]), `${slug(schoolName)}-students-${Date.now()}.csv`);
    setBusy(null);
  }

  function exportSubjectsCsv() {
    setBusy("csv-subjects");
    const header = ["Subject", "Average", "Students"];
    const rows = summary.subjectAverages.map((s) => [s.subject, s.average.toFixed(1), s.students]);
    handleBlob(toCsv([header, ...rows]), `${slug(schoolName)}-subject-averages-${Date.now()}.csv`);
    setBusy(null);
  }

  function exportDistributionCsv() {
    setBusy("csv-distribution");
    const header = ["Subject", "Critical", "At Risk", "Monitoring", "On Track", "Excellent"];
    const rows = summary.classDistribution.map((d) => [
      d.subject,
      d.CRITICAL,
      d.AT_RISK,
      d.MONITORING,
      d.ON_TRACK,
      d.EXCELLENT,
    ]);
    handleBlob(toCsv([header, ...rows]), `${slug(schoolName)}-distribution-${Date.now()}.csv`);
    setBusy(null);
  }

  function exportImprovedCsv() {
    setBusy("csv-improved");
    const header = ["Student", "Last term avg", "Current avg", "Improvement"];
    const rows = summary.mostImproved.map((m) => [
      m.name,
      m.lastAvg.toFixed(1),
      m.currentAvg.toFixed(1),
      m.improvement.toFixed(1),
    ]);
    handleBlob(toCsv([header, ...rows]), `${slug(schoolName)}-most-improved-${Date.now()}.csv`);
    setBusy(null);
  }

  function openHtmlReport() {
    setBusy("pdf");
    const html = buildSchoolHtmlReport({ schoolName, termName, summary, students });
    const w = window.open("", "_blank");
    if (!w) {
      setBusy(null);
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.print();
      setBusy(null);
    }, 200);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Insights</p>
        <h1 className="text-2xl font-black text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">
          Generate, share, and download performance reports for {schoolName} · {termName}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-indigo-600" /> School performance report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">
              A printable summary covering subject averages, class distribution and the top improvers for the term.
            </p>
            <Button onClick={openHtmlReport} disabled={busy === "pdf"} className="bg-indigo-600 hover:bg-indigo-700">
              {busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Open & print
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4 text-cyan-600" /> CSV exports
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={exportStudentsCsv} disabled={busy !== null}>
              {busy === "csv-students" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Students
            </Button>
            <Button variant="outline" onClick={exportSubjectsCsv} disabled={busy !== null}>
              {busy === "csv-subjects" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Subject averages
            </Button>
            <Button variant="outline" onClick={exportDistributionCsv} disabled={busy !== null}>
              {busy === "csv-distribution" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Distribution
            </Button>
            <Button variant="outline" onClick={exportImprovedCsv} disabled={busy !== null}>
              {busy === "csv-improved" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Most improved
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Individual student reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600">
            Open a student profile to view a detailed report, or print a student report card directly from their profile page.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {students.slice(0, 12).map((s) => (
              <a
                key={s.id}
                href={`/institution/dashboard/students/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <span className="text-sm font-bold text-gray-900">{s.name}</span>
                <PerformanceBadge status={s.flag} />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function toCsv(rows: (string | number)[][]): Blob {
  const text = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return new Blob([text], { type: "text/csv;charset=utf-8" });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildSchoolHtmlReport({
  schoolName,
  termName,
  summary,
  students,
}: {
  schoolName: string;
  termName: string;
  summary: {
    subjectAverages: SubjectAvg[];
    classDistribution: Distribution[];
    mostImproved: MostImproved[];
    strugglingSubjects: { subject: string; struggling: number }[];
  };
  students: { id: string; name: string; average: number; flag: "RED" | "YELLOW" | "GREEN" }[];
}): string {
  const overallAvg = summary.subjectAverages.length
    ? summary.subjectAverages.reduce((s, x) => s + x.average, 0) / summary.subjectAverages.length
    : 0;
  const totalStudents = students.length;
  const green = students.filter((s) => s.flag === "GREEN").length;
  const yellow = students.filter((s) => s.flag === "YELLOW").length;
  const red = students.filter((s) => s.flag === "RED").length;

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(schoolName)} — ${escapeHtml(termName)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color: #0f172a; padding: 32px; }
  h1 { margin: 0 0 4px; font-size: 28px; }
  h2 { margin: 24px 0 8px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .green { background: #d1fae5; color: #065f46; }
  .yellow { background: #fef3c7; color: #92400e; }
  .red { background: #fee2e2; color: #991b1b; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0 24px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
  .stat .value { font-size: 24px; font-weight: 800; margin-top: 4px; }
</style></head>
<body>
  <h1>${escapeHtml(schoolName)}</h1>
  <div style="color:#6b7280">${escapeHtml(termName)} · Generated ${new Date().toLocaleDateString()}</div>

  <h2>Overview</h2>
  <div class="stat-grid">
    <div class="stat"><div class="label">Overall average</div><div class="value">${overallAvg.toFixed(1)}%</div></div>
    <div class="stat"><div class="label">Students</div><div class="value">${totalStudents}</div></div>
    <div class="stat"><div class="label">On track (green)</div><div class="value" style="color:#059669">${green}</div></div>
    <div class="stat"><div class="label">Flagged (red + yellow)</div><div class="value" style="color:#dc2626">${red + yellow}</div></div>
  </div>

  <h2>Subject averages</h2>
  <table>
    <thead><tr><th>Subject</th><th>Average</th><th>Students</th></tr></thead>
    <tbody>${summary.subjectAverages
      .map((s) => `<tr><td>${escapeHtml(s.subject)}</td><td>${s.average.toFixed(1)}%</td><td>${s.students}</td></tr>`)
      .join("")}</tbody>
  </table>

  <h2>Class distribution</h2>
  <table>
    <thead><tr><th>Subject</th><th>Critical</th><th>At Risk</th><th>Monitoring</th><th>On Track</th><th>Excellent</th></tr></thead>
    <tbody>${summary.classDistribution
      .map((d) => `<tr><td>${escapeHtml(d.subject)}</td><td>${d.CRITICAL}</td><td>${d.AT_RISK}</td><td>${d.MONITORING}</td><td>${d.ON_TRACK}</td><td>${d.EXCELLENT}</td></tr>`)
      .join("")}</tbody>
  </table>

  <h2>Top improvers (current vs last term)</h2>
  <table>
    <thead><tr><th>Student</th><th>Last term</th><th>This term</th><th>Change</th></tr></thead>
    <tbody>${summary.mostImproved
      .map((m) => `<tr><td>${escapeHtml(m.name)}</td><td>${m.lastAvg.toFixed(1)}%</td><td>${m.currentAvg.toFixed(1)}%</td><td>+${m.improvement.toFixed(1)}</td></tr>`)
      .join("")}</tbody>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
