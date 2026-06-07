"use server";

import { z } from "zod";
import { Prisma, type InstitutionPlan, type SchoolType, type Curriculum, type AdminTitle, type InstitutionStatus } from "@/generated/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getResend } from "@/lib/email";
import { revalidatePath } from "next/cache";

// Zod schemas for the 4-step wizard. Used to validate before insert.

const Step1Schema = z.object({
  schoolName: z.string().min(2, "School name is required").max(120),
  schoolType: z.enum(["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY"]),
  curriculum: z.enum(["CBC", "EIGHT_FOUR_FOUR", "IGCSE", "MIXED", "UNIVERSITY"]),
  county: z.string().min(2, "County is required"),
  subCounty: z.string().min(2, "Sub-county is required"),
  studentCount: z.coerce.number().int().min(1).max(100000),
});

const Step2Schema = z.object({
  adminName: z.string().min(2, "Full name is required").max(120),
  adminTitle: z.enum(["PRINCIPAL", "DEPUTY", "HOD", "REGISTRAR", "OTHER"]),
  adminEmail: z.string().email("Valid email is required").max(160),
  adminPhone: z
    .string()
    .min(9, "Phone number is required")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Phone format looks off"),
  password: z.string().min(8, "Password must be at least 8 characters").max(120),
});

const Step3Schema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
});

const FullApplicationSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);

export type InstitutionApplicationInput = z.infer<typeof FullApplicationSchema>;

export type SubmitApplicationResult =
  | { ok: true; institutionId: string; status: InstitutionStatus }
  | { ok: false; error: string; field?: string };

/**
 * Submit a new institution application. The flow is:
 *   1. Validate every field with zod.
 *   2. Create a Supabase auth account for the admin (or sign them in if
 *      the email already exists — we'll then link via InstitutionMember).
 *   3. Insert the Institution row with status PENDING.
 *   4. Insert an InstitutionAdmin for the user.
 *   5. Insert an InstitutionMember (role INSTITUTION_ADMIN).
 *   6. Fan out a notification to every founder via notifyManyUsers.
 *   7. Email the founders a heads-up.
 *   8. Email the admin a "we received your application" message.
 */
export async function submitInstitutionApplication(
  input: InstitutionApplicationInput,
): Promise<SubmitApplicationResult> {
  const parsed = FullApplicationSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Please double-check the form",
      field: issue?.path[0] as string | undefined,
    };
  }
  const data = parsed.data;

  // ─── 1. Supabase auth ────────────────────────────────────────────────────
  const supabase = await createClient();
  let userId: string | null = null;

  // Try sign up; if the email is already registered we fall back to
  // fetching the existing user by email (handled via a "sign in with
  // link" pattern — for the application flow we just need the auth
  // account to exist so we can link an InstitutionMember to it).
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: data.adminEmail,
    password: data.password,
    options: {
      data: {
        name: data.adminName,
        role: "INSTITUTION_ADMIN",
        institution_apply: data.schoolName,
      },
    },
  });

  if (signUpErr && !signUpErr.message.toLowerCase().includes("already")) {
    return { ok: false, error: signUpErr.message };
  }

  if (signUpData?.user?.id) {
    userId = signUpData.user.id;
  } else {
    // Email already exists — pull the user via admin client so we can
    // link the application to their existing Edyfra account.
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) return { ok: false, error: listErr.message };
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === data.adminEmail.toLowerCase(),
    );
    if (!existing) {
      return {
        ok: false,
        error:
          "An account with this email already exists. Please sign in and contact us to add this school to your account.",
      };
    }
    userId = existing.id;
  }

  if (!userId) return { ok: false, error: "Could not create or find the admin account." };

  // ─── 1b. Prisma User row ─────────────────────────────────────────────────
  // The InstitutionAdmin / InstitutionMember inserts have a foreign key to
  // the User table, so we MUST ensure a Prisma User row exists for this
  // user id before we try to create the institution. Supabase signUp only
  // creates the auth account, not the Prisma mirror row.
  //
  // We use upsert so this is idempotent: if the user already has a Prisma
  // row (because they signed up to Edyfra before), we just refresh the
  // name/county without overwriting their existing role.
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: data.adminName,
        email: data.adminEmail,
      },
      create: {
        id: userId,
        email: data.adminEmail,
        name: data.adminName,
        // Prisma's Role enum doesn't include INSTITUTION_ADMIN, so we keep
        // the default (STUDENT). Institution access is gated by the
        // InstitutionAdmin / InstitutionMember tables, not by User.role.
        role: "STUDENT",
        county: data.county,
        lastActiveAt: new Date(),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[submitInstitutionApplication] failed to upsert Prisma user:", err);
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "production"
          ? "We couldn't create your account on our side. Please try again in a moment."
          : `We couldn't create your account on our side. (${detail})`,
      field: "adminEmail",
    };
  }

  // ─── 2. Prisma: institution + memberships ───────────────────────────────
  try {
    const institution = await prisma.$transaction(async (tx) => {
      // Generate a unique invite code
      const code = await generateInstitutionCode(tx, data.schoolName);

      const inst = await tx.institution.create({
        data: {
          name: data.schoolName,
          type: data.schoolType,
          schoolType: data.schoolType as SchoolType,
          curriculum: data.curriculum as Curriculum,
          county: data.county,
          subCounty: data.subCounty,
          studentCount: data.studentCount,
          adminName: data.adminName,
          adminTitle: data.adminTitle as AdminTitle,
          adminPhone: data.adminPhone,
          adminEmail: data.adminEmail,
          primaryAdminUserId: userId,
          planTier: data.plan as InstitutionPlan,
          status: "PENDING" as InstitutionStatus,
          code,
          email: data.adminEmail,
        },
      });

      await tx.institutionAdmin.create({
        data: {
          institutionId: inst.id,
          userId,
          title: data.adminTitle as AdminTitle,
          isPrimary: true,
        },
      });

      await tx.institutionMember.create({
        data: {
          institutionId: inst.id,
          userId,
          role: "INSTITUTION_ADMIN",
          status: "PENDING",
        },
      });

      await tx.institutionActivity.create({
        data: {
          institutionId: inst.id,
          type: "ADMIN_ADDED",
          actorUserId: userId,
          title: "Application submitted",
          body: `${data.schoolName} applied for the ${data.plan} plan.`,
        },
      });

      return inst;
    });

    // ─── 3. Notify founders ────────────────────────────────────────────────
    await notifyFoundersOfApplication(institution.id, data.schoolName, data.adminName, data.plan);

    // ─── 4. Email admins a confirmation ────────────────────────────────────
    await emailApplicantConfirmation(data.adminEmail, data.adminName, data.schoolName).catch(
      (e) => console.warn("[institution-signup] applicant email failed:", e),
    );

    revalidatePath("/institution");
    revalidatePath("/admin/institutions");
    return { ok: true, institutionId: institution.id, status: institution.status };
  } catch (err) {
    console.error("[submitInstitutionApplication] failed:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return { ok: false, error: "An institution with similar details already exists." };
      }
      // Foreign-key violation = a row we tried to link to is missing.
      // The most common cause is a missing Prisma User row, but the
      // upsert above should now prevent that. If we still get one,
      // surface the specific missing field so the user can tell us.
      if (err.code === "P2003") {
        return {
          ok: false,
          error: `Your application is missing a related record (${err.meta?.field_name ?? "unknown"}). Please refresh and try again.`,
        };
      }
    }
    const detail = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Something went wrong on our side. (${detail})` };
  }
}

async function generateInstitutionCode(
  tx: Prisma.TransactionClient,
  schoolName: string,
): Promise<string> {
  // Take first letters of each word + a 4-digit suffix from a timestamp.
  const slug = schoolName
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .padEnd(2, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const candidate = `${slug}${suffix}`;
  // Ensure uniqueness
  const exists = await tx.institution.findUnique({ where: { code: candidate } });
  if (exists) return generateInstitutionCode(tx, schoolName + " ");
  return candidate;
}

async function notifyFoundersOfApplication(
  institutionId: string,
  schoolName: string,
  adminName: string,
  plan: string,
) {
  try {
    const founders = await prisma.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          { email: process.env.ADMIN_EMAIL_1 ?? "__none__" },
          { email: process.env.ADMIN_EMAIL_2 ?? "__none__" },
        ],
      },
      select: { id: true },
    });
    if (founders.length === 0) return;

    const { notifyManyUsers } = await import("./notifications");
    await notifyManyUsers(founders.map((f) => f.id), {
      type: "ANNOUNCEMENT",
      title: `New institution application`,
      body: `${schoolName} (admin: ${adminName}) just applied for the ${plan} plan.`,
      actionUrl: `/admin/institutions/${institutionId}`,
    });
  } catch (err) {
    console.warn("[notifyFoundersOfApplication] failed:", err);
  }

  // Email the founders as well
  try {
    const resend = getResend();
    const recipients = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2].filter(
      (e): e is string => !!e,
    );
    if (recipients.length === 0) return;
    await resend.emails.send({
      from: "Edyfra <noreply@edyfra.com>",
      to: recipients,
      subject: `New institution application — ${schoolName}`,
      html: `
        <h2>New institution application</h2>
        <p><strong>${schoolName}</strong> has applied for the <strong>${plan}</strong> plan.</p>
        <p>Admin contact: ${adminName}</p>
        <p>Review the application in the founder admin:</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/institutions/${institutionId}">Open application</a></p>
      `,
    });
  } catch (err) {
    console.warn("[notifyFoundersOfApplication] email failed:", err);
  }
}

async function emailApplicantConfirmation(
  email: string,
  name: string,
  schoolName: string,
) {
  const resend = getResend();
  await resend.emails.send({
    from: "Edyfra Institutions <institutions@edyfra.com>",
    to: email,
    subject: `Application received — ${schoolName}`,
    html: `
      <h2>Hi ${name},</h2>
      <p>We've received your application for <strong>${schoolName}</strong> to join the Edyfra Institutions program.</p>
      <p>Our team will review your details and contact you within 24 hours. If you don't hear from us, reply to this email.</p>
      <p>— The Edyfra team</p>
    `,
  });
}
