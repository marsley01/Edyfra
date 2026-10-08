"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { requireInstitutionAdmin } from "./institution-guard";
import { logInstitutionActivity } from "./_institution-access";
import { getResend } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

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

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function bulkInviteStudents(input: z.infer<typeof BulkInviteSchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = BulkInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  let invited = 0;
  let emailFailures = 0;
  let resend: ReturnType<typeof getResend> | null = null;
  try {
    resend = getResend();
  } catch (e) {
    console.warn("[bulkInviteStudents] email disabled:", e);
  }
  for (const r of parsed.data.rows) {
    // Cryptographically random, unguessable token (was Math.random()).
    const token = randomBytes(24).toString("hex");
    // Re-inviting must also refresh the expiry, otherwise an expired invite
    // is "re-sent" with a link that is already dead.
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
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
          expiresAt,
        },
        update: { status: "PENDING", token, name: r.name, formYear: r.formYear ?? null, expiresAt },
      });
      invited++;
    } catch (e) {
      console.warn("[bulkInviteStudents] row failed:", r.email, e);
      continue;
    }

    // The UI promises every student an email; previously none was sent.
    if (resend) {
      try {
        const acceptUrl = `${getAppUrl()}/institution/accept?token=${token}`;
        await resend.emails.send({
          from: "Edyfra Institutions <institutions@edyfra.online>",
          to: r.email,
          subject: `You're invited to join ${membership.institution.name} on Edyfra`,
          html: `
            <h2>Hi ${escapeHtml(r.name)},</h2>
            <p><strong>${escapeHtml(membership.institution.name)}</strong> has invited you to join them on Edyfra as a student.</p>
            <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#FF9500;color:white;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
            <p>This link expires in 14 days.</p>
          `,
        });
      } catch (e) {
        emailFailures++;
        console.warn("[bulkInviteStudents] email failed:", r.email, e);
      }
    } else {
      emailFailures++;
    }
  }
  revalidatePath("/institution/dashboard/students");
  return { ok: true as const, invited, emailFailures };
}

const AcceptSchema = z.object({ token: z.string().min(10) });

type InviteCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      invite: NonNullable<Awaited<ReturnType<typeof findInvite>>>;
    };

async function findInvite(token: string) {
  return prisma.institutionInvitation.findUnique({
    where: { token },
    include: { institution: true },
  });
}

async function checkInvite(token: string): Promise<InviteCheck> {
  const invite = await findInvite(token);
  if (!invite) return { ok: false, error: "Invitation not found" };
  if (invite.status !== "PENDING") return { ok: false, error: "Invitation already used or revoked" };
  if (invite.expiresAt < new Date()) {
    await prisma.institutionInvitation.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { ok: false, error: "Invitation has expired" };
  }
  if (!invite.institution.isActive) {
    return { ok: false, error: "This institution is not active on Edyfra yet" };
  }
  return { ok: true, invite };
}

/**
 * Public-facing preview: validates the token and tells the page who the
 * invitation is for and whether the current viewer can accept it.
 */
export async function acceptInvitation(input: z.infer<typeof AcceptSchema>) {
  const parsed = AcceptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid token" };
  const check = await checkInvite(parsed.data.token);
  if (!check.ok) return { ok: false as const, error: check.error };
  const invite = check.invite;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return {
    ok: true as const,
    invitation: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      institutionName: invite.institution.name,
    },
    viewerEmail: user?.email ?? null,
  };
}

const INVITE_ROLE_TO_MEMBER_ROLE = {
  STUDENT: "INSTITUTION_STUDENT",
  TEACHER: "INSTITUTION_TEACHER",
  ADMIN: "INSTITUTION_DEPUTY",
} as const;

/**
 * Accepts an invitation for the signed-in user. Validates the token, its
 * status and expiry, and that the invitation was issued to the caller's own
 * (verified) email address before creating the institution membership.
 */
export async function claimInvitation(input: z.infer<typeof AcceptSchema>) {
  const parsed = AcceptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid token" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false as const, error: "Sign in to accept this invitation" };
  }

  const check = await checkInvite(parsed.data.token);
  if (!check.ok) return { ok: false as const, error: check.error };
  const invite = check.invite;

  if (!user.email_confirmed_at) {
    return { ok: false as const, error: "Confirm your email address first, then open this link again." };
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      ok: false as const,
      error: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.`,
    };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!dbUser) {
    return { ok: false as const, error: "Finish setting up your Edyfra account, then open this link again." };
  }

  const memberRole = INVITE_ROLE_TO_MEMBER_ROLE[invite.role];
  try {
    await prisma.$transaction(async (tx) => {
      // Mark accepted first, conditioned on still being PENDING, so the same
      // token can't be redeemed twice concurrently.
      const claimed = await tx.institutionInvitation.updateMany({
        where: { id: invite.id, status: "PENDING" },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("ALREADY_CLAIMED");

      const existing = await tx.institutionMember.findUnique({
        where: { institutionId_userId: { institutionId: invite.institutionId, userId: dbUser.id } },
        select: { role: true, status: true },
      });
      // Never downgrade an existing admin/deputy through an invite link.
      const keepRole =
        existing?.status === "ACTIVE" &&
        (existing.role === "INSTITUTION_ADMIN" || existing.role === "INSTITUTION_DEPUTY");

      await tx.institutionMember.upsert({
        where: { institutionId_userId: { institutionId: invite.institutionId, userId: dbUser.id } },
        create: {
          institutionId: invite.institutionId,
          userId: dbUser.id,
          role: memberRole,
          status: "ACTIVE",
        },
        update: keepRole ? { status: "ACTIVE" } : { status: "ACTIVE", role: memberRole },
      });

      if (invite.role === "TEACHER") {
        for (const subject of invite.subjects) {
          await tx.teacherSubjectAssignment.upsert({
            where: {
              institutionId_teacherUserId_subject: {
                institutionId: invite.institutionId,
                teacherUserId: dbUser.id,
                subject,
              },
            },
            create: {
              institutionId: invite.institutionId,
              teacherUserId: dbUser.id,
              subject,
              formYear: invite.formYear,
            },
            update: { formYear: invite.formYear },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_CLAIMED") {
      return { ok: false as const, error: "Invitation already used or revoked" };
    }
    console.error("[claimInvitation] failed:", err);
    return { ok: false as const, error: "We couldn't accept that invitation. Please try again." };
  }

  await logInstitutionActivity(invite.institutionId, {
    type: invite.role === "TEACHER" ? "TEACHER_JOINED" : invite.role === "STUDENT" ? "STUDENT_JOINED" : "ADMIN_ADDED",
    actorUserId: dbUser.id,
    targetUserId: dbUser.id,
    title: "Invitation accepted",
    body: `${invite.name} joined ${invite.institution.name}.`,
  });

  revalidatePath("/institution/dashboard", "layout");
  return {
    ok: true as const,
    role: invite.role,
    institutionName: invite.institution.name,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
