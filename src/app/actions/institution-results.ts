"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { logActivity } from "./institution-admin";
import { deriveFlag, deriveOverallStatus, deriveTrend } from "@/lib/institution-plans";
import type { ValidatedRow } from "./institution-results-helpers";

// ─── Import ─────────────────────────────────────────────────────────────

const ImportSchema = z.object({
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
  rows: z
    .array(
      z.object({
        admissionNumber: z.string().min(1).max(60),
        studentName: z.string().min(1).max(120),
        subject: z.string().min(1).max(60),
        marks: z.number().min(0).max(100),
        grade: z.string().max(8).nullish(),
        term: z.number().int().min(1).max(3),
        year: z.number().int().min(2020).max(2099),
        form: z.string().min(1).max(20),
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

  // Pre-compute per-student term averages
  const studentAvg = new Map<string, number>();
  for (const r of data.rows) {
    const key = r.admissionNumber || r.studentName;
    if (!key) continue;
    const cur = studentAvg.get(key) ?? 0;
    studentAvg.set(key, cur + r.marks);
  }
  const studentCount = new Map<string, number>();
  for (const r of data.rows) {
    const key = r.admissionNumber || r.studentName;
    studentCount.set(key, (studentCount.get(key) ?? 0) + 1);
  }
  for (const [k, sum] of studentAvg.entries()) {
    studentAvg.set(k, sum / (studentCount.get(k) ?? 1));
  }

  // Pre-compute last-term marks per (student, subject)
  const lastTerm = data.term === 1 ? 3 : data.term - 1;
  const lastYear = data.term === 1 ? data.year - 1 : data.year;
  const studentIdsByName = await findStudentIdsByAdmission(data.rows);
  const lastTermKeys = new Set<string>();
  for (const r of data.rows) {
    const sid = studentIdsByName.get(r.admissionNumber || r.studentName);
    if (!sid) continue;
    lastTermKeys.add(`${sid}|${r.subject}`);
  }
  const lastTermMap = new Map<string, number>();
  if (lastTermKeys.size > 0) {
    const lastRows = await prisma.studentResult.findMany({
      where: {
        term: lastTerm,
        year: lastYear,
        studentUserId: { in: Array.from(lastTermKeys).map((k) => k.split("|")[0]) },
      },
      select: { studentUserId: true, subject: true, marks: true },
    });
    for (const r of lastRows) {
      lastTermMap.set(`${r.studentUserId}|${r.subject}`, r.marks);
    }
  }

  // Insert
  let inserted = 0;
  await prisma.$transaction(async (tx) => {
    // Delete any existing results for this (institution, term, year) so re-imports are clean
    await tx.studentResult.deleteMany({
      where: { institutionId, term: data.term, year: data.year },
    });
    await tx.studentResultsAnalysis.deleteMany({
      where: { institutionId, term: data.term, year: data.year },
    });

    for (const r of data.rows) {
      const studentUserId = studentIdsByName.get(r.admissionNumber || r.studentName);
      if (!studentUserId) continue;

      const lastMarks = lastTermMap.get(`${studentUserId}|${r.subject}`) ?? null;
      const flag = deriveFlag(r.marks);
      const trend = deriveTrend(r.marks, lastMarks);
      const subjectFlag = flag;

      const created = await tx.studentResult.create({
        data: {
          institutionId,
          studentUserId,
          admissionNumber: r.admissionNumber,
          studentName: r.studentName,
          subject: r.subject,
          marks: r.marks,
          grade: r.grade,
          term: data.term,
          year: data.year,
          form: r.form,
          uploadedById: uploaderId,
        },
      });

      await tx.studentResultsAnalysis.create({
        data: {
          studentResultId: created.id,
          studentUserId,
          institutionId,
          subject: r.subject,
          term: data.term,
          year: data.year,
          marks: r.marks,
          lastTermMarks: lastMarks,
          trend,
          flag: subjectFlag,
          overallStatus: "GREEN", // re-evaluated below per student
          aiInsight: null,
        },
      });
      inserted++;
    }

    // Recompute overallStatus per student
    const studentGrouped = await tx.studentResultsAnalysis.findMany({
      where: { institutionId, term: data.term, year: data.year },
      select: { id: true, studentUserId: true, flag: true },
    });
    const byS = new Map<string, typeof studentGrouped>();
    for (const s of studentGrouped) {
      if (!byS.has(s.studentUserId)) byS.set(s.studentUserId, []);
      byS.get(s.studentUserId)!.push(s);
    }
    for (const [studentUserId, group] of byS.entries()) {
      const status = deriveOverallStatus(group.map((g) => ({ flag: g.flag as "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT" })));
      await tx.studentResultsAnalysis.updateMany({
        where: { id: { in: group.map((g) => g.id) } },
        data: { overallStatus: status },
      });
    }
  });

  await logActivity(institutionId, {
    type: "RESULTS_UPLOADED",
    actorUserId: uploaderId,
    title: "Results uploaded",
    body: `${inserted} result rows for Term ${data.term} ${data.year}.`,
  });

  revalidatePath("/institution/dashboard/results");
  revalidatePath("/institution/dashboard");
  revalidatePath("/institution/dashboard/students");

  return { ok: true as const, inserted };
}

async function findStudentIdsByAdmission(
  rows: ValidatedRow[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const admissionNumbers = Array.from(new Set(rows.map((r) => r.admissionNumber).filter(Boolean)));
  const names = Array.from(new Set(rows.map((r) => r.studentName).filter(Boolean)));

  // First, try InstitutionStudent.studentIdStr match
  const instStudents = admissionNumbers.length
    ? await prisma.institutionStudent.findMany({
        where: { studentIdStr: { in: admissionNumbers } },
        select: { userId: true, studentIdStr: true },
      })
    : [];
  for (const s of instStudents) {
    if (s.studentIdStr) map.set(s.studentIdStr, s.userId);
  }

  // Then fall back to name match for any remaining
  const unmatched = rows.filter((r) => !map.has(r.admissionNumber));
  if (unmatched.length > 0) {
    const searchNames = Array.from(new Set(unmatched.map((r) => r.studentName)));
    const users = await prisma.user.findMany({
      where: { name: { in: searchNames, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    for (const u of users) {
      map.set(u.name.toLowerCase(), u.id);
    }
  }
  // Build a unified lookup keyed by admission OR name
  const out = new Map<string, string>();
  for (const r of rows) {
    const byAdm = r.admissionNumber ? map.get(r.admissionNumber) : undefined;
    const byName = map.get(r.studentName.toLowerCase());
    const id = byAdm ?? byName;
    if (id) out.set(r.admissionNumber || r.studentName, id);
  }
  return out;
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
  return prisma.studentResultsAnalysis.findMany({
    where: { studentUserId, institutionId, term, year },
    orderBy: { subject: "asc" },
  });
}
