"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { logActivity } from "./institution-admin";

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
  await prisma.coachingAssignment.updateMany({
    where: { id, institutionId: membership.institution.id },
    data: { status: "CANCELLED" },
  });
  await logActivity(membership.institution.id, {
    type: "COACHING_ASSIGNED",
    actorUserId: membership.member.userId,
    title: "Coaching assignment cancelled",
  });
  revalidatePath("/institution/dashboard/coaching");
  return { ok: true as const };
}

export async function getCoachingAssignments(institutionId: string) {
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
  const term = await prisma.academicTerm.findFirst({
    where: { institutionId, isCurrent: true },
  });
  if (!term) return false;
  if (!term.holidayStart || !term.holidayEnd) return false;
  const now = new Date();
  return now >= term.holidayStart && now <= term.holidayEnd;
}
