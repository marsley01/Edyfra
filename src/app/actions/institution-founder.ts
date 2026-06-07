"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkAdminStatus } from "./admin";
import { logActivity as _logActivity } from "./institution-admin";

/**
 * Founder-only: list all institution applications (typically PENDING).
 */
export async function listInstitutionApplications(filter?: "PENDING" | "ACTIVE" | "ALL") {
  const isAdmin = await checkAdminStatus();
  if (!isAdmin) return [];
  const where = filter && filter !== "ALL" ? { status: filter } : undefined;
  return prisma.institution.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: { where: { status: "ACTIVE" } },
          students: true,
          tutors: true,
        },
      },
    },
  });
}

const DecisionSchema = z.object({
  institutionId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  approverUserId: z.string().min(1),
});

export async function decideInstitutionApplication(input: z.infer<typeof DecisionSchema>) {
  const isAdmin = await checkAdminStatus();
  if (!isAdmin) return { ok: false as const, error: "Forbidden" };
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { institutionId, decision, approverUserId } = parsed.data;

  const inst = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!inst) return { ok: false as const, error: "Institution not found" };

  if (decision === "APPROVE") {
    await prisma.$transaction(async (tx) => {
      await tx.institution.update({
        where: { id: institutionId },
        data: {
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedByUserId: approverUserId,
        },
      });
      // Activate pending members
      await tx.institutionMember.updateMany({
        where: { institutionId, status: "PENDING" },
        data: { status: "ACTIVE" },
      });
      await tx.institutionActivity.create({
        data: {
          institutionId,
          type: "ADMIN_ADDED",
          actorUserId: approverUserId,
          title: "Application approved",
          body: "Founder approved the application — the school is now active.",
        },
      });
    });

    // Email the admin
    try {
      const { getResend } = await import("@/lib/email");
      const resend = getResend();
      if (inst.adminEmail) {
        await resend.emails.send({
          from: "Edyfra Institutions <institutions@edyfra.com>",
          to: inst.adminEmail,
          subject: `Welcome to Edyfra — ${inst.name} is approved`,
          html: `
            <h2>Welcome, ${inst.adminName ?? "Admin"}</h2>
            <p>Your school <strong>${inst.name}</strong> is now active on Edyfra Institutions.</p>
            <p>Sign in to your dashboard to start adding teachers and students.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/institution/login">Open the dashboard</a></p>
          `,
        });
      }
    } catch (e) {
      console.warn("[decideInstitutionApplication] approval email failed:", e);
    }
  } else {
    await prisma.institution.update({
      where: { id: institutionId },
      data: { status: "REJECTED" },
    });
    await prisma.institutionMember.updateMany({
      where: { institutionId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
  }

  revalidatePath("/admin/institutions");
  return { ok: true as const };
}
