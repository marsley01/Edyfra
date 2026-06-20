"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { getResend } from "@/lib/email";

const BulkInviteSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        formYear: z.string().max(20).optional().nullable(),
        admissionNumber: z.string().max(60).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export async function bulkInviteStudents(input: z.infer<typeof BulkInviteSchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = BulkInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  let invited = 0;
  for (const r of parsed.data.rows) {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    try {
      await prisma.institutionInvitation.upsert({
        where: {
          institutionId_email_role: {
            institutionId: membership.institution.id,
            email: r.email.toLowerCase(),
            role: "STUDENT",
          },
        },
        create: {
          institutionId: membership.institution.id,
          email: r.email.toLowerCase(),
          name: r.name,
          role: "STUDENT",
          formYear: r.formYear ?? null,
          token,
          invitedById: membership.member.userId,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        update: { status: "PENDING", token, name: r.name },
      });
      invited++;
    } catch (e) {
      console.warn("[bulkInviteStudents] row failed:", r.email, e);
    }
  }
  revalidatePath("/institution/dashboard/students");
  return { ok: true as const, invited };
}

const AcceptSchema = z.object({ token: z.string().min(10) });

/**
 * Public-facing: a teacher or student uses their invitation token
 * to either join (if their Edyfra account exists) or to be guided to
 * signup. The caller is responsible for auth.
 */
export async function acceptInvitation(input: z.infer<typeof AcceptSchema>) {
  const parsed = AcceptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid token" };
  const invite = await prisma.institutionInvitation.findUnique({
    where: { token: parsed.data.token },
    include: { institution: true },
  });
  if (!invite) return { ok: false as const, error: "Invitation not found" };
  if (invite.status !== "PENDING") return { ok: false as const, error: "Invitation already used or revoked" };
  if (invite.expiresAt < new Date()) {
    await prisma.institutionInvitation.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { ok: false as const, error: "Invitation has expired" };
  }
  return { ok: true as const, invitation: { id: invite.id, email: invite.email, name: invite.name, role: invite.role, institutionName: invite.institution.name } };
}
