"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { assertInstitutionAdminAccess, logInstitutionActivity as logActivity } from "./_institution-access";

const AssignmentSchema = z.object({
  studentUserId: z.string().min(1),
  teacherUserId: z.string().min(1),
  subject: z.string().min(1).max(60),
  schedule: z.string().max(200).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isHoliday: z.boolean().default(false),
});

export type AssignmentInput = z.infer<typeof AssignmentSchema>;

export async function createCoachingAssignment(input: AssignmentInput) {
  const membership = await requireInstitutionAdmin();
  const parsed = AssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  if (data.endDate < data.startDate) {
    return { ok: false as const, error: "End date must be after start date" };
  }

  // Both parties must be active members of THIS institution in the right role;
  // never trust client-supplied user ids (also avoids an FK-violation crash).
  const [studentMember, teacherMember] = await Promise.all([
    prisma.institutionMember.findFirst({
      where: {
        institutionId: membership.institution.id,
        userId: data.studentUserId,
        role: "INSTITUTION_STUDENT",
        status: "ACTIVE",
      },
      select: { id: true },
    }),
    prisma.institutionMember.findFirst({
      where: {
        institutionId: membership.institution.id,
        userId: data.teacherUserId,
        role: "INSTITUTION_TEACHER",
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);
  if (!studentMember) return { ok: false as const, error: "Pick a student from your institution" };
  if (!teacherMember) return { ok: false as const, error: "Pick an active teacher from your institution" };

  const created = await prisma.coachingAssignment.create({
    data: {
      institutionId: membership.institution.id,
      studentUserId: data.studentUserId,
      teacherUserId: data.teacherUserId,
      subject: data.subject,
      schedule: data.schedule ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      isHoliday: data.isHoliday,
    },
  });

  await logActivity(membership.institution.id, {
    type: "COACHING_ASSIGNED",
    actorUserId: membership.member.userId,
    targetUserId: data.studentUserId,
    title: "Coaching assignment created",
    body: `Student assigned to teacher for ${data.subject}.`,
  });

  revalidatePath("/institution/dashboard/coaching");
  return { ok: true as const, id: created.id };
}

export async function cancelCoachingAssignment(id: string) {
  const membership = await requireInstitutionAdmin();
  const res = await prisma.coachingAssignment.updateMany({
    where: { id, institutionId: membership.institution.id },
    data: { status: "CANCELLED" },
  });
  if (res.count === 0) return { ok: false as const, error: "Assignment not found" };
  await logActivity(membership.institution.id, {
    type: "COACHING_ASSIGNED",
    actorUserId: membership.member.userId,
    title: "Coaching assignment cancelled",
  });
  revalidatePath("/institution/dashboard/coaching");
  return { ok: true as const };
}

export async function getCoachingAssignments(institutionId: string) {
  await assertInstitutionAdminAccess(institutionId);
  return prisma.coachingAssignment.findMany({
    where: { institutionId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      teacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isHolidayCoachingActive(institutionId: string): Promise<boolean> {
  await assertInstitutionAdminAccess(institutionId);
  const term = await prisma.academicTerm.findFirst({
    where: { institutionId, isCurrent: true },
  });
  if (!term) return false;
  if (!term.holidayStart || !term.holidayEnd) return false;
  const now = new Date();
  return now >= term.holidayStart && now <= term.holidayEnd;
}
