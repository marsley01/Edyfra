"use server";

// Write-side actions for the institution portal: single-mark edits, academic
// term management and bulk coaching from recommendations. Every action
// resolves the caller's institution via requireInstitutionAdmin() and never
// trusts an institution id from the client.

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { deriveFlag, deriveTrend } from "@/lib/institution-plans";
import { COACHING_DEFAULTS, gradeForScore, previousTerm } from "@/lib/institution-analytics";
import { requireInstitutionAdmin } from "./institution-guard";
import { assertInstitutionAdminAccess, logInstitutionActivity } from "./_institution-access";
import { recomputeOverallStatus } from "./_institution-results-import";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function revalidatePortal() {
  revalidatePath("/institution/dashboard", "layout");
}

// ─── Single-mark edit ───────────────────────────────────────────────────

const MarkSchema = z.object({
  studentUserId: z.string().min(1),
  subject: z.string().trim().min(1, "Subject is required").max(60),
  marks: z.coerce.number().min(0, "Marks must be 0-100").max(100, "Marks must be 0-100"),
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2000).max(2100),
});

/**
 * Sets one student's mark for one subject in one term. Updates the existing
 * result (and its analysis row) when present, otherwise creates it, then
 * re-derives the student's overall status for the term.
 */
export async function upsertStudentMark(input: z.input<typeof MarkSchema>): Promise<Result<{ resultId: string; created: boolean }>> {
  const membership = await requireInstitutionAdmin();
  const parsed = MarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid mark" };
  const { studentUserId, subject, marks, term, year } = parsed.data;
  const institutionId = membership.institution.id;

  const member = await prisma.institutionMember.findFirst({
    where: { institutionId, userId: studentUserId, role: "INSTITUTION_STUDENT", status: "ACTIVE" },
    select: { user: { select: { name: true, email: true } } },
  });
  if (!member) return { ok: false, error: "That student is not enrolled in your institution." };

  const prev = previousTerm({ term, year });
  try {
    const out = await prisma.$transaction(async (tx) => {
      const [existing, template, last] = await Promise.all([
        tx.studentResult.findMany({
          where: { institutionId, studentUserId, term, year, subject: { equals: subject, mode: "insensitive" } },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        }),
        tx.studentResult.findFirst({
          where: { institutionId, studentUserId },
          select: { admissionNumber: true, form: true, studentName: true },
          orderBy: [{ year: "desc" }, { term: "desc" }],
        }),
        tx.studentResult.findFirst({
          where: { institutionId, studentUserId, term: prev.term, year: prev.year, subject: { equals: subject, mode: "insensitive" } },
          select: { marks: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const lastMarks = last?.marks ?? null;
      const analysis = {
        marks,
        lastTermMarks: lastMarks,
        trend: deriveTrend(marks, lastMarks),
        flag: deriveFlag(marks),
      } as const;

      let resultId: string;
      let created = false;
      if (existing.length > 0) {
        resultId = existing[0].id;
        // Collapse duplicates left by older, non-idempotent imports.
        if (existing.length > 1) {
          await tx.studentResult.deleteMany({ where: { id: { in: existing.slice(1).map((e) => e.id) } } });
        }
        await tx.studentResult.update({
          where: { id: resultId },
          data: { marks, score: marks, grade: gradeForScore(marks).grade, uploadedById: membership.member.userId },
        });
        await tx.studentResultsAnalysis.upsert({
          where: { studentResultId: resultId },
          update: analysis,
          create: {
            ...analysis,
            studentResultId: resultId,
            studentUserId,
            institutionId,
            subject,
            term,
            year,
            overallStatus: "GREEN",
          },
        });
      } else {
        resultId = randomUUID();
        created = true;
        await tx.studentResult.create({
          data: {
            id: resultId,
            institutionId,
            studentUserId,
            studentName: template?.studentName || member.user.name,
            studentEmail: member.user.email,
            admissionNumber: template?.admissionNumber ?? null,
            form: template?.form ?? null,
            subject,
            marks,
            score: marks,
            grade: gradeForScore(marks).grade,
            term,
            year,
            uploadedById: membership.member.userId,
          },
        });
        await tx.studentResultsAnalysis.create({
          data: { ...analysis, studentResultId: resultId, studentUserId, institutionId, subject, term, year, overallStatus: "GREEN" },
        });
      }
      await recomputeOverallStatus(tx, institutionId, term, year, [studentUserId]);
      return { resultId, created };
    });

    await logInstitutionActivity(institutionId, {
      type: "RESULTS_UPLOADED",
      actorUserId: membership.member.userId,
      targetUserId: studentUserId,
      title: out.created ? "Mark added" : "Mark corrected",
      body: `${member.user.name}: ${subject} = ${marks} (Term ${term} ${year}).`,
    });
    revalidatePortal();
    return { ok: true, ...out };
  } catch (err) {
    console.error("[upsertStudentMark] failed:", err);
    return { ok: false, error: "Could not save that mark. Please try again." };
  }
}

export async function deleteStudentMark(resultId: string): Promise<Result> {
  const membership = await requireInstitutionAdmin();
  const institutionId = membership.institution.id;
  const row = await prisma.studentResult.findFirst({
    where: { id: String(resultId), institutionId },
    select: { id: true, studentUserId: true, term: true, year: true, subject: true, studentName: true },
  });
  if (!row) return { ok: false, error: "That mark was not found." };
  await prisma.$transaction(async (tx) => {
    await tx.studentResultsAnalysis.deleteMany({ where: { studentResultId: row.id } });
    await tx.studentResult.delete({ where: { id: row.id } });
    if (row.studentUserId) await recomputeOverallStatus(tx, institutionId, row.term, row.year, [row.studentUserId]);
  });
  await logInstitutionActivity(institutionId, {
    type: "RESULTS_UPLOADED",
    actorUserId: membership.member.userId,
    targetUserId: row.studentUserId,
    title: "Mark removed",
    body: `${row.studentName}: ${row.subject} (Term ${row.term} ${row.year}).`,
  });
  revalidatePortal();
  return { ok: true };
}

// ─── Academic terms ─────────────────────────────────────────────────────

export interface AcademicTermRow {
  id: string;
  term: number;
  year: number;
  startDate: Date;
  endDate: Date;
  holidayStart: Date | null;
  holidayEnd: Date | null;
  isCurrent: boolean;
  results: number;
}

export async function listAcademicTerms(institutionId: string): Promise<AcademicTermRow[]> {
  await assertInstitutionAdminAccess(institutionId);
  const [terms, counts] = await Promise.all([
    prisma.academicTerm.findMany({ where: { institutionId }, orderBy: [{ year: "desc" }, { term: "desc" }] }),
    prisma.studentResult.groupBy({ by: ["year", "term"], where: { institutionId }, _count: { _all: true } }),
  ]);
  const countOf = new Map(counts.map((c) => [`${c.year}-${c.term}`, c._count._all]));
  return terms.map((t) => ({
    id: t.id,
    term: t.term,
    year: t.year,
    startDate: t.startDate,
    endDate: t.endDate,
    holidayStart: t.holidayStart,
    holidayEnd: t.holidayEnd,
    isCurrent: t.isCurrent,
    results: countOf.get(`${t.year}-${t.term}`) ?? 0,
  }));
}

export async function setCurrentAcademicTerm(termId: string): Promise<Result> {
  const membership = await requireInstitutionAdmin();
  const institutionId = membership.institution.id;
  const term = await prisma.academicTerm.findFirst({ where: { id: String(termId), institutionId }, select: { id: true, term: true, year: true } });
  if (!term) return { ok: false, error: "Term not found." };
  await prisma.$transaction([
    prisma.academicTerm.updateMany({ where: { institutionId, isCurrent: true }, data: { isCurrent: false } }),
    prisma.academicTerm.update({ where: { id: term.id }, data: { isCurrent: true } }),
    prisma.institution.update({ where: { id: institutionId }, data: { currentTermId: term.id } }),
  ]);
  await logInstitutionActivity(institutionId, {
    type: "SETTINGS_UPDATED",
    actorUserId: membership.member.userId,
    title: "Current term changed",
    body: `Term ${term.term} ${term.year} is now the current term.`,
  });
  revalidatePortal();
  return { ok: true };
}

/** Deletes the calendar entry only; uploaded results for that term are kept. */
export async function deleteAcademicTerm(termId: string): Promise<Result> {
  const membership = await requireInstitutionAdmin();
  const institutionId = membership.institution.id;
  const term = await prisma.academicTerm.findFirst({ where: { id: String(termId), institutionId } });
  if (!term) return { ok: false, error: "Term not found." };
  if (term.isCurrent) return { ok: false, error: "Make another term current before deleting this one." };
  await prisma.academicTerm.delete({ where: { id: term.id } });
  await logInstitutionActivity(institutionId, {
    type: "SETTINGS_UPDATED",
    actorUserId: membership.member.userId,
    title: "Term removed",
    body: `Term ${term.term} ${term.year} was removed from the calendar (results kept).`,
  });
  revalidatePortal();
  return { ok: true };
}

// ─── Coaching from recommendations ──────────────────────────────────────

const BulkCoachingSchema = z.object({
  items: z
    .array(
      z.object({
        studentUserId: z.string().min(1),
        teacherUserId: z.string().min(1),
        subject: z.string().trim().min(1).max(60),
      }),
    )
    .min(1, "Pick at least one recommendation")
    .max(200),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  schedule: z.string().max(200).optional().nullable(),
});

/**
 * Creates coaching assignments for accepted recommendations. Re-validates
 * membership and teacher capacity server-side, skips pairs already being
 * coached, and defaults the window to the current term's holiday (or the next
 * four weeks when no holiday is set).
 */
export async function createCoachingFromRecommendations(
  input: z.input<typeof BulkCoachingSchema>,
): Promise<Result<{ created: number; skipped: { subject: string; reason: string }[] }>> {
  const membership = await requireInstitutionAdmin();
  const parsed = BulkCoachingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const institutionId = membership.institution.id;
  const { items } = parsed.data;

  const current = await prisma.academicTerm.findFirst({ where: { institutionId, isCurrent: true } });
  const now = new Date();
  const holidayAhead = current?.holidayStart && current.holidayEnd && current.holidayEnd > now;
  const startDate = parsed.data.startDate ?? (holidayAhead ? current!.holidayStart! : now);
  const endDate = parsed.data.endDate ?? (holidayAhead ? current!.holidayEnd! : new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000));
  if (endDate < startDate) return { ok: false, error: "End date must be after start date" };

  const studentIds = [...new Set(items.map((i) => i.studentUserId))];
  const teacherIds = [...new Set(items.map((i) => i.teacherUserId))];
  const [students, teachers, loads, existing] = await Promise.all([
    prisma.institutionMember.findMany({
      where: { institutionId, userId: { in: studentIds }, role: "INSTITUTION_STUDENT", status: "ACTIVE" },
      select: { userId: true },
    }),
    prisma.institutionMember.findMany({
      where: { institutionId, userId: { in: teacherIds }, role: "INSTITUTION_TEACHER", status: "ACTIVE" },
      select: { userId: true },
    }),
    prisma.coachingAssignment.groupBy({
      by: ["teacherUserId"],
      where: { institutionId, teacherUserId: { in: teacherIds }, status: { in: ["ACTIVE", "SCHEDULED"] } },
      _count: { _all: true },
    }),
    prisma.coachingAssignment.findMany({
      where: { institutionId, studentUserId: { in: studentIds }, status: { in: ["ACTIVE", "SCHEDULED"] } },
      select: { studentUserId: true, subject: true },
    }),
  ]);
  const okStudents = new Set(students.map((s) => s.userId));
  const okTeachers = new Set(teachers.map((t) => t.userId));
  const load = new Map(loads.map((l) => [l.teacherUserId, l._count._all]));
  const taken = new Set(existing.map((e) => `${e.studentUserId}|${e.subject.toLowerCase()}`));

  const toCreate: { studentUserId: string; teacherUserId: string; subject: string }[] = [];
  const skipped: { subject: string; reason: string }[] = [];
  for (const i of items) {
    const key = `${i.studentUserId}|${i.subject.toLowerCase()}`;
    if (!okStudents.has(i.studentUserId)) skipped.push({ subject: i.subject, reason: "Student is not enrolled" });
    else if (!okTeachers.has(i.teacherUserId)) skipped.push({ subject: i.subject, reason: "Teacher is not active" });
    else if (taken.has(key)) skipped.push({ subject: i.subject, reason: "Already being coached in this subject" });
    else if ((load.get(i.teacherUserId) ?? 0) >= COACHING_DEFAULTS.capacity)
      skipped.push({ subject: i.subject, reason: "Teacher is at capacity" });
    else {
      toCreate.push(i);
      taken.add(key);
      load.set(i.teacherUserId, (load.get(i.teacherUserId) ?? 0) + 1);
    }
  }
  if (toCreate.length === 0) return { ok: false, error: skipped[0]?.reason ?? "Nothing to create" };

  const res = await prisma.coachingAssignment.createMany({
    data: toCreate.map((i) => ({
      institutionId,
      studentUserId: i.studentUserId,
      teacherUserId: i.teacherUserId,
      subject: i.subject,
      schedule: parsed.data.schedule ?? null,
      startDate,
      endDate,
      isHoliday: !!holidayAhead && !parsed.data.startDate,
    })),
  });
  await logInstitutionActivity(institutionId, {
    type: "COACHING_ASSIGNED",
    actorUserId: membership.member.userId,
    title: "Coaching assigned from recommendations",
    body: `${res.count} coaching assignment${res.count === 1 ? "" : "s"} created.`,
  });
  revalidatePortal();
  return { ok: true, created: res.count, skipped };
}
