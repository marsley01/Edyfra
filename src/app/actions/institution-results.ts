"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { assertInstitutionAdminAccess, logInstitutionActivity as logActivity } from "./_institution-access";
import { importResultRows } from "./_institution-results-import";

// ─── Import ─────────────────────────────────────────────────────────────

const ImportSchema = z.object({
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
  rows: z
    .array(
      z.object({
        admissionNumber: z.string().min(1).max(60),
        studentName: z.string().min(1).max(160),
        subject: z.string().min(1).max(60),
        marks: z.number().min(0).max(100),
        grade: z.string().max(8).nullish(),
        term: z.number().int().min(1).max(3),
        year: z.number().int().min(2020).max(2099),
        form: z.string().min(1).max(40),
      }),
    )
    .min(1)
    .max(20000),
});

export type ImportResultsInput = z.infer<typeof ImportSchema>;

export async function importStudentResults(input: ImportResultsInput) {
  const membership = await requireInstitutionAdmin();
  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const institutionId = membership.institution.id;
  const uploaderId = membership.member.userId;

  let outcome;
  try {
    // Idempotent: re-importing the same term replaces the matching
    // (student, subject, term) results instead of duplicating them, and no
    // longer wipes subjects that are not in this file.
    outcome = await importResultRows({
      institutionId,
      uploaderId,
      term: data.term,
      year: data.year,
      rows: data.rows,
    });
  } catch (err) {
    console.error("[importStudentResults] failed:", err);
    return { ok: false as const, error: "We couldn't save those results. Please try again." };
  }

  if (outcome.inserted + outcome.updated === 0) {
    return {
      ok: false as const,
      error: `None of the ${data.rows.length} rows matched a student enrolled in your institution. Add the students (with their admission numbers) first, then re-import.`,
    };
  }

  await logActivity(institutionId, {
    type: "RESULTS_UPLOADED",
    actorUserId: uploaderId,
    title: "Results uploaded",
    body: `Term ${data.term} ${data.year}: ${outcome.inserted} new, ${outcome.updated} updated, ${outcome.skipped} unmatched.`,
  });

  revalidatePath("/institution/dashboard", "layout");

  return {
    ok: true as const,
    inserted: outcome.inserted,
    updated: outcome.updated,
    skipped: outcome.skipped,
    duplicatesInFile: outcome.duplicatesInFile,
    unmatchedNames: outcome.unmatchedNames,
  };
}

// ─── Analysis queries ────────────────────────────────────────────────────

export interface ClassDistributionRow {
  subject: string;
  CRITICAL: number;
  AT_RISK: number;
  MONITORING: number;
  ON_TRACK: number;
  EXCELLENT: number;
}

export interface SubjectAverageRow {
  subject: string;
  average: number;
  students: number;
}

export interface MostImprovedRow {
  studentUserId: string;
  name: string;
  currentAvg: number;
  lastAvg: number;
  improvement: number;
}

export interface StrugglingSubjectRow {
  subject: string;
  struggling: number;
}

export interface FormComparisonRow {
  form: string;
  average: number;
}

export interface ResultsSummary {
  subjectAverages: SubjectAverageRow[];
  classDistribution: ClassDistributionRow[];
  mostImproved: MostImprovedRow[];
  strugglingSubjects: StrugglingSubjectRow[];
  formComparison: FormComparisonRow[];
}

export async function getResultsSummary(institutionId: string): Promise<ResultsSummary> {
  await assertInstitutionAdminAccess(institutionId);
  const analyses = await prisma.studentResultsAnalysis.findMany({
    where: { institutionId },
    include: { result: { select: { form: true, studentName: true, admissionNumber: true } } },
  });

  // Subject performance averages
  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const a of analyses) {
    const k = a.subject;
    if (!bySubject.has(k)) bySubject.set(k, { sum: 0, count: 0 });
    const cur = bySubject.get(k)!;
    cur.sum += a.marks;
    cur.count += 1;
  }
  const subjectAverages = Array.from(bySubject.entries())
    .map(([subject, v]) => ({ subject, average: Math.round((v.sum / v.count) * 10) / 10, students: v.count }))
    .sort((a, b) => b.average - a.average);

  // Class distribution (per subject, count of each flag)
  const classDist = new Map<string, Record<string, number>>();
  for (const a of analyses) {
    if (!classDist.has(a.subject)) classDist.set(a.subject, { CRITICAL: 0, AT_RISK: 0, MONITORING: 0, ON_TRACK: 0, EXCELLENT: 0 });
    classDist.get(a.subject)![a.flag] += 1;
  }
  const classDistribution: ClassDistributionRow[] = Array.from(classDist.entries()).map(([subject, flags]) => ({
    subject,
    CRITICAL: flags.CRITICAL,
    AT_RISK: flags.AT_RISK,
    MONITORING: flags.MONITORING,
    ON_TRACK: flags.ON_TRACK,
    EXCELLENT: flags.EXCELLENT,
  }));

  // Most improved students (biggest positive diff between term N and N-1)
  const perStudent = new Map<string, { name: string; sum: number; count: number; lastSum: number; lastCount: number }>();
  for (const a of analyses) {
    const k = a.studentUserId;
    if (!perStudent.has(k)) perStudent.set(k, { name: a.result.studentName, sum: 0, count: 0, lastSum: 0, lastCount: 0 });
    const cur = perStudent.get(k)!;
    cur.sum += a.marks;
    cur.count += 1;
    if (a.lastTermMarks != null) {
      cur.lastSum += a.lastTermMarks;
      cur.lastCount += 1;
    }
  }
  const mostImproved: MostImprovedRow[] = Array.from(perStudent.entries())
    .filter(([, v]) => v.lastCount > 0)
    .map(([id, v]) => ({
      studentUserId: id,
      name: v.name,
      currentAvg: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
      lastAvg: v.lastCount ? Math.round((v.lastSum / v.lastCount) * 10) / 10 : 0,
      improvement: v.lastCount ? Math.round(((v.sum / v.count) - (v.lastSum / v.lastCount)) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 10);

  // Subjects with most struggling students
  const strugglingSubjects = classDistribution
    .map((s) => ({ subject: s.subject, struggling: s.CRITICAL + s.AT_RISK }))
    .filter((s) => s.struggling > 0)
    .sort((a, b) => b.struggling - a.struggling);

  // Form comparison
  const byForm = new Map<string, { sum: number; count: number }>();
  for (const a of analyses) {
    const f = a.result.form || "Unknown";
    if (!byForm.has(f)) byForm.set(f, { sum: 0, count: 0 });
    const cur = byForm.get(f)!;
    cur.sum += a.marks;
    cur.count += 1;
  }
  const formComparison = Array.from(byForm.entries())
    .map(([form, v]) => ({ form, average: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average);

  return { subjectAverages, classDistribution, mostImproved, strugglingSubjects, formComparison };
}

export async function getStudentResultsHistory(studentUserId: string, institutionId: string) {
  await assertInstitutionAdminAccess(institutionId);
  const rows = await prisma.studentResult.findMany({
    where: { studentUserId, institutionId },
    orderBy: [{ year: "asc" }, { term: "asc" }],
  });
  return rows;
}

export async function getStudentAnalyses(
  studentUserId: string,
  institutionId: string,
  term: number,
  year: number,
) {
  await assertInstitutionAdminAccess(institutionId);
  return prisma.studentResultsAnalysis.findMany({
    where: { studentUserId, institutionId, term, year },
    orderBy: { subject: "asc" },
  });
}
