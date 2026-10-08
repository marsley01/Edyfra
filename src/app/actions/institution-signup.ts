"use server";

import { z } from "zod";
import { Prisma, type InstitutionPlan, type SchoolType, type Curriculum, type AdminTitle, type InstitutionStatus } from "@/generated/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { emailTypoMessage } from "@/lib/institution-email";
import { getResend } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { revalidatePath } from "next/cache";

// Zod schemas for the 4-step wizard. Used to validate before insert.

const Step1Schema = z.object({
  schoolName: z.string().min(2, "School name is required").max(120),
  schoolType: z.enum(["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY"]),
  // The public /institution/apply form only collects a subset of the wizard
  // fields, so the rest are optional here and stored as null when absent.
  curriculum: z.enum(["CBC", "EIGHT_FOUR_FOUR", "IGCSE", "MIXED", "UNIVERSITY"]).optional(),
  county: z.string().min(2, "County is required"),
  subCounty: z.string().min(2, "Sub-county is required").optional(),
  studentCount: z.coerce.number().int().min(1).max(100000).optional(),
  address: z.string().max(200).optional(),
  website: z.string().max(160).optional(),
});

const Step2Schema = z.object({
  adminName: z.string().min(2, "Full name is required").max(120),
  adminTitle: z.enum(["PRINCIPAL", "DEPUTY", "HOD", "REGISTRAR", "OTHER"]).default("OTHER"),
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .email("Please enter a valid email address")
    .superRefine((value, ctx) => {
      const typo = emailTypoMessage(value);
      if (typo) ctx.addIssue({ code: "custom", message: typo });
    }),
  adminPhone: z
    .string()
    .min(9, "Phone number is required")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Phone format looks off"),
  password: z.string().min(8, "Password must be at least 8 characters").max(120),
});

const Step3Schema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]).optional(),
});

const FullApplicationSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);

export type InstitutionApplicationInput = z.input<typeof FullApplicationSchema>;

export type SubmitApplicationResult =
  | { ok: true; institutionId: string; status: InstitutionStatus }
  | { ok: false; error: string; field?: string };

/**
 * Submit a new institution application. The flow is:
 *   1. Validate every field with zod.
 *   2. Create a confirmed auth user with the service role (no confirmation
 *      email), or, if the email is taken, require that account's password.
 *   3-5. In one transaction: Prisma User (if missing), Institution (PENDING),
 *      InstitutionAdmin, InstitutionMember. If it fails, the auth user created
 *      in step 2 is deleted again.
 *   6. Fan out a notification to every founder via notifyManyUsers.
 *   7. Email the founders a heads-up.
 *   8. Email the admin a "we received your application" message.
 */
export async function submitInstitutionSignup(
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

  const email = data.adminEmail;

  // Refuse a double-submit / second application from the same person while
  // one is still being reviewed (looked up by email so it also catches older
  // accounts whose Prisma id differs from their auth id).
  try {
    const pendingApp = await prisma.institutionAdmin.findFirst({
      where: {
        user: { email: { equals: email, mode: "insensitive" } },
        institution: { status: "PENDING" },
      },
      select: { id: true },
    });
    if (pendingApp) {
      return {
        ok: false,
        error: "You already have an application under review. We'll email you as soon as it's approved.",
        field: "adminEmail",
      };
    }
  } catch (err) {
    console.error("[submitInstitutionSignup] pending lookup failed:", err);
  }

  // ─── 1. Auth account (service role, no confirmation email) ──────────────
  // supabase.auth.signUp() from the server sent a confirmation email through
  // the Send Email hook and was IP-rate-limited (every request shares Vercel's
  // egress IP), so applications failed intermittently, and the raw error object
  // reached the UI as "{}". The admin API creates a confirmed user directly.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[submitInstitutionSignup] admin client unavailable:", err);
    return { ok: false, error: "Applications are temporarily unavailable. Please try again shortly." };
  }

  const supabase = await createClient();
  let authUserId: string;
  let createdNow = false;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.adminName,
      role: "INSTITUTION_ADMIN",
      institution_apply: data.schoolName,
    },
  });

  if (created?.user && !createErr) {
    authUserId = created.user.id;
    createdNow = true;
  } else if (isAlreadyRegistered(createErr)) {
    // Existing account: the applicant must prove they own it. Without this,
    // anyone could attach a school to someone else's account.
    const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signInErr || !signIn.user) {
      return {
        ok: false,
        error:
          "An account with this email already exists. Enter that account's password to link this school to it.",
        field: "password",
      };
    }
    authUserId = signIn.user.id;
  } else {
    console.error("[submitInstitutionSignup] createUser failed:", createErr?.message ?? createErr);
    return { ok: false, error: friendlyAuthError(createErr), field: authErrorField(createErr) };
  }

  // ─── 2. Prisma: user + institution + memberships, all-or-nothing ────────
  let institution: { id: string; isActive: boolean };
  try {
    // Older accounts can have a Prisma id that differs from the auth id, so
    // resolve the profile by id OR email before deciding to create one.
    const existingProfile = await prisma.user.findFirst({
      where: { OR: [{ id: authUserId }, { email: { equals: email, mode: "insensitive" } }] },
      select: { id: true },
    });

    // TODO(RLS): new institution creation needs a scoped INSERT policy before this can move to Supabase client — founder has no InstitutionMember row yet at this point in the flow.
    institution = await prisma.$transaction(
      async (tx) => {
        let userId = existingProfile?.id;
        if (userId) {
          await tx.user.update({ where: { id: userId }, data: { name: data.adminName } });
        } else {
          const user = await tx.user.create({
            data: {
              id: authUserId,
              email,
              name: data.adminName,
              // Institution access is gated by InstitutionAdmin/InstitutionMember,
              // not User.role (whose enum has no institution roles).
              role: "STUDENT",
              county: data.county,
              lastActiveAt: new Date(),
            },
            select: { id: true },
          });
          userId = user.id;
        }

        const code = await generateInstitutionCode(tx, data.schoolName);
        const inst = await tx.institution.create({
          data: {
            name: data.schoolName,
            type: data.schoolType,
            code,
            email,
            isActive: false,
            status: "PENDING",
            schoolType: data.schoolType as SchoolType,
            curriculum: (data.curriculum ?? null) as Curriculum | null,
            county: data.county,
            subCounty: data.subCounty ?? null,
            studentCount: data.studentCount ?? null,
            address: data.address || null,
            website: data.website || null,
            adminName: data.adminName,
            adminTitle: data.adminTitle as AdminTitle,
            adminPhone: data.adminPhone,
            adminEmail: email,
            primaryAdminUserId: userId,
            planTier: (data.plan ?? null) as InstitutionPlan | null,
          },
          select: { id: true, isActive: true },
        });

        await tx.institutionAdmin.create({
          data: { institutionId: inst.id, userId, title: data.adminTitle as AdminTitle, isPrimary: true },
        });
        await tx.institutionMember.create({
          data: { institutionId: inst.id, userId, role: "INSTITUTION_ADMIN", status: "PENDING" },
        });
        await tx.institutionActivity.create({
          data: {
            institutionId: inst.id,
            type: "ADMIN_ADDED",
            actorUserId: userId,
            title: "Application submitted",
            body: data.plan
              ? `${data.schoolName} applied for the ${data.plan} plan.`
              : `${data.schoolName} applied to join Edyfra Institutions.`,
          },
        });
        return inst;
      },
      { timeout: 20_000 },
    );
  } catch (err) {
    console.error("[submitInstitutionSignup] database write failed:", err);
    // Roll back the auth user we just created so the email is not left
    // registered without a usable account (and the applicant can retry).
    if (createdNow) {
      await admin.auth.admin
        .deleteUser(authUserId)
        .catch((e) => console.error("[submitInstitutionSignup] rollback deleteUser failed:", e));
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An institution with these details already exists. Try signing in instead." };
    }
    return { ok: false, error: "We couldn't save your application. Please try again in a moment." };
  }

  // Sign the new admin in (sets session cookies) so the pending page can show
  // their application. Non-fatal: they can always sign in manually.
  if (createdNow) {
    await supabase.auth
      .signInWithPassword({ email, password: data.password })
      .catch((e) => console.warn("[submitInstitutionSignup] post-signup sign-in failed:", e));
  }

  // ─── 3. Notify founders + confirm to applicant (best-effort) ────────────
  await notifyFoundersOfApplication(institution.id, data.schoolName, data.adminName, data.plan ?? "STARTER");
  await emailApplicantConfirmation(email, data.adminName, data.schoolName).catch((e) =>
    console.warn("[institution-signup] applicant email failed:", e),
  );

  revalidatePath("/institution");
  revalidatePath("/admin/institutions");
  return { ok: true, institutionId: institution.id, status: institution.isActive ? "ACTIVE" : "PENDING" };
}

type AuthErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

function isAlreadyRegistered(err: AuthErrorLike): boolean {
  if (!err) return false;
  if (err.code === "email_exists" || err.code === "user_already_exists") return true;
  return /already (been )?registered|already exists/i.test(err.message ?? "");
}

/** Always a plain, user-facing string, never a stringified error object. */
function friendlyAuthError(err: AuthErrorLike): string {
  const code = err?.code ?? "";
  const message = typeof err?.message === "string" ? err.message : "";
  if (code === "weak_password" || /password/i.test(message)) {
    return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  }
  if (code === "email_address_invalid" || /invalid.*email|email.*invalid/i.test(message)) {
    return "That email address doesn't look valid. Please check it and try again.";
  }
  if (err?.status === 429 || /rate limit/i.test(message)) {
    return "Too many attempts right now. Please wait a minute and try again.";
  }
  return "We couldn't create your account right now. Please try again in a moment.";
}

function authErrorField(err: AuthErrorLike): string | undefined {
  const message = `${err?.code ?? ""} ${err?.message ?? ""}`;
  if (/password/i.test(message)) return "password";
  if (/email/i.test(message)) return "adminEmail";
  return undefined;
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
      from: "Edyfra <noreply@edyfra.online>",
      to: recipients,
      subject: `New institution application — ${schoolName}`,
      html: `
        <h2>New institution application</h2>
        <p><strong>${escapeHtml(schoolName)}</strong> has applied for the <strong>${escapeHtml(plan)}</strong> plan.</p>
        <p>Admin contact: ${escapeHtml(adminName)}</p>
        <p>Review the application in the founder admin:</p>
        <p><a href="${getAppUrl()}/admin/institutions/${institutionId}">Open application</a></p>
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
    from: "Edyfra Institutions <institutions@edyfra.online>",
    to: email,
    subject: `Application received — ${schoolName}`,
    html: `
      <h2>Hi ${escapeHtml(name)},</h2>
      <p>We've received your application for <strong>${escapeHtml(schoolName)}</strong> to join the Edyfra Institutions program.</p>
      <p>Our team will review your details and contact you within 24 hours. If you don't hear from us, reply to this email.</p>
      <p>— The Edyfra team</p>
    `,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
