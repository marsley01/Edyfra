// Shared, idempotent results import used by the importStudentResults server
// action and POST /api/institution/upload-csv.
//
// Intentionally NOT a "use server" module: callers must authenticate and pass
// the institution id they resolved from the caller's membership.
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/client";
import { deriveFlag, deriveOverallStatus, deriveTrend } from "@/lib/institution-plans";
import { gradeForScore, previousTerm, resultKey } from "@/lib/institution-analytics";

export interface ImportRow {
  admissionNumber?: string | null;
  studentName: string;
  studentEmail?: string | null;
  subject: string;
  marks: number;
  grade?: string | null;
  form?: string | null;
}

export interface ImportOutcome {
  inserted: number; // new (student, subject, term) results
  updated: number; // existing results replaced by this import
  skipped: number; // rows that matched no enrolled student
  duplicatesInFile: number; // rows superseded by a later row for the same key
  unmatchedNames: string[]; // first few unmatched names, for the UI
}

type Flag = "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT";

/**
 * Re-importing the same term never duplicates: each row is keyed by
 * (student, subject case-insensitive, term, year). Existing results for the
 * keys in the file are replaced; results for keys NOT in the file are left
 * alone (so uploading Maths does not wipe English). Overall status is then
 * recomputed from every subject the affected students have this term.
 */
export async function importResultRows(args: {
  institutionId: string;
  uploaderId: string;
  term: number;
  year: number;
  rows: ImportRow[];
  csvUploadId?: string | null;
}): Promise<ImportOutcome> {
  const { institutionId, uploaderId, term, year } = args;
  const matcher = await buildStudentMatcher(institutionId);

  // 1. Resolve students and de-duplicate within the file (last row wins).
  const byKey = new Map<string, ImportRow & { studentUserId: string }>();
  let skipped = 0;
  const unmatched = new Set<string>();
  for (const r of args.rows) {
    const studentUserId = matcher(r);
    if (!studentUserId) {
      skipped++;
      if (unmatched.size < 10) unmatched.add(r.studentName);
      continue;
    }
    byKey.set(resultKey({ studentUserId, subject: r.subject, term, year }), {
      ...r,
      subject: r.subject.trim(),
      studentUserId,
    });
  }
  const matchedRows = args.rows.length - skipped;
  const duplicatesInFile = matchedRows - byKey.size;
  if (byKey.size === 0) {
    return { inserted: 0, updated: 0, skipped, duplicatesInFile: 0, unmatchedNames: [...unmatched] };
  }

  const studentIds = [...new Set([...byKey.values()].map((r) => r.studentUserId))];

  // 2. Previous-term marks for the trend column (one query).
  const prev = previousTerm({ term, year });
  const prevRows = await prisma.studentResult.findMany({
    where: { institutionId, term: prev.term, year: prev.year, studentUserId: { in: studentIds } },
    select: { studentUserId: true, subject: true, marks: true },
  });
  const prevMarks = new Map(
    prevRows.map((r) => [resultKey({ studentUserId: r.studentUserId!, subject: r.subject, term, year }), r.marks]),
  );

  // 3. Build rows in memory.
  const resultRows: Prisma.StudentResultCreateManyInput[] = [];
  const analysisRows: (Prisma.StudentResultsAnalysisCreateManyInput & { flag: Flag })[] = [];
  for (const [key, r] of byKey) {
    const id = randomUUID();
    const last = prevMarks.get(key) ?? null;
    resultRows.push({
      id,
      institutionId,
      studentUserId: r.studentUserId,
      admissionNumber: r.admissionNumber || null,
      studentName: r.studentName,
      studentEmail: r.studentEmail || null,
      subject: r.subject,
      marks: r.marks,
      score: r.marks,
      grade: r.grade || gradeForScore(r.marks).grade,
      term,
      year,
      form: r.form || null,
      uploadedById: uploaderId,
      csvUploadId: args.csvUploadId ?? null,
    });
    analysisRows.push({
      studentResultId: id,
      studentUserId: r.studentUserId,
      institutionId,
      subject: r.subject,
      term,
      year,
      marks: r.marks,
      lastTermMarks: last,
      trend: deriveTrend(r.marks, last),
      flag: deriveFlag(r.marks),
      overallStatus: "GREEN", // recomputed below
      aiInsight: null,
    });
  }

  // 4. Replace existing results for exactly these keys, then recompute status.
  const replaced = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.studentResult.findMany({
        where: { institutionId, term, year, studentUserId: { in: studentIds } },
        select: { id: true, studentUserId: true, subject: true },
      });
      const toReplace = existing.filter((e) =>
        byKey.has(resultKey({ studentUserId: e.studentUserId!, subject: e.subject, term, year })),
      );
      const replacedKeys = new Set(
        toReplace.map((e) => resultKey({ studentUserId: e.studentUserId!, subject: e.subject, term, year })),
      );
      if (toReplace.length > 0) {
        const ids = toReplace.map((e) => e.id);
        await tx.studentResultsAnalysis.deleteMany({ where: { studentResultId: { in: ids } } });
        await tx.studentResult.deleteMany({ where: { id: { in: ids } } });
      }
      await tx.studentResult.createMany({ data: resultRows });
      await tx.studentResultsAnalysis.createMany({ data: analysisRows });
      await recomputeOverallStatus(tx, institutionId, term, year, studentIds);
      return replacedKeys.size;
    },
    { timeout: 60_000 },
  );

  return {
    inserted: byKey.size - replaced,
    updated: replaced,
    skipped,
    duplicatesInFile,
    unmatchedNames: [...unmatched],
  };
}

/**
 * Re-derives StudentResultsAnalysis.overallStatus for the given students from
 * all of their subjects in the term. At most three UPDATE statements.
 */
export async function recomputeOverallStatus(
  tx: Prisma.TransactionClient,
  institutionId: string,
  term: number,
  year: number,
  studentIds: string[],
) {
  if (studentIds.length === 0) return;
  const rows = await tx.studentResultsAnalysis.findMany({
    where: { institutionId, term, year, studentUserId: { in: studentIds } },
    select: { studentUserId: true, flag: true },
  });
  const flags = new Map<string, { flag: Flag }[]>();
  for (const r of rows) {
    const arr = flags.get(r.studentUserId) ?? [];
    arr.push({ flag: r.flag as Flag });
    flags.set(r.studentUserId, arr);
  }
  const byStatus: Record<"RED" | "YELLOW" | "GREEN", string[]> = { RED: [], YELLOW: [], GREEN: [] };
  for (const [sid, f] of flags) byStatus[deriveOverallStatus(f)].push(sid);
  for (const status of ["RED", "YELLOW", "GREEN"] as const) {
    if (byStatus[status].length === 0) continue;
    await tx.studentResultsAnalysis.updateMany({
      where: { institutionId, term, year, studentUserId: { in: byStatus[status] } },
      data: { overallStatus: status },
    });
  }
}

/**
 * Returns a function resolving an import row to an ACTIVE student of this
 * institution: by admission number, then email, then an unambiguous name.
 * Never matches users outside the institution.
 */
async function buildStudentMatcher(institutionId: string) {
  const [members, instStudents] = await Promise.all([
    prisma.institutionMember.findMany({
      where: { institutionId, role: "INSTITUTION_STUDENT", status: "ACTIVE" },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.institutionStudent.findMany({
      where: { institutionId, studentIdStr: { not: null } },
      select: { userId: true, studentIdStr: true },
    }),
  ]);
  const memberIds = new Set(members.map((m) => m.userId));
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const byAdmission = new Map<string, string>();
  for (const s of instStudents) {
    if (s.studentIdStr && memberIds.has(s.userId)) byAdmission.set(norm(s.studentIdStr), s.userId);
  }
  const byEmail = new Map(members.map((m) => [norm(m.user.email), m.userId]));
  const byName = new Map<string, string | null>();
  for (const m of members) {
    const k = norm(m.user.name);
    byName.set(k, byName.has(k) ? null : m.userId); // null = ambiguous
  }
  return (r: ImportRow): string | null =>
    (r.admissionNumber ? byAdmission.get(norm(r.admissionNumber)) : undefined) ??
    (r.studentEmail ? byEmail.get(norm(r.studentEmail)) : undefined) ??
    byName.get(norm(r.studentName)) ??
    null;
}
