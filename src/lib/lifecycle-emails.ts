import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { getResend } from "@/lib/email";
import prisma from "@/lib/prisma";

/**
 * Emails for the application and approval lifecycle (tutors and schools).
 *
 * Every function here is best-effort: it logs and returns instead of throwing,
 * because a mail outage must never undo or block the database change that
 * triggered it (an approval, a submitted application). Callers do not need a
 * try/catch.
 */

const FROM_TEAM = "Edyfra <team@edyfra.online>";
const FROM_INSTITUTIONS = "Edyfra Institutions <institutions@edyfra.online>";
const BRAND = "#FF9500";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(name: string | null | undefined): string {
  return esc((name || "there").trim().split(/\s+/)[0] || "there");
}

/** Plain table layout: renders in Gmail and Outlook with no remote assets. */
function layout(title: string, paragraphs: string[], cta?: { href: string; label: string }): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569">${p}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="display:inline-block;background:${BRAND};color:#1a1033;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0"><tr><td>
      <p style="margin:0 0 24px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${BRAND}">Edyfra</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a">${title}</h1>
      ${body}${button}
      <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">You are receiving this because of activity on your Edyfra account.</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
}

async function send(args: { from: string; to: string | string[]; subject: string; html: string; tag: string }) {
  try {
    const recipients = (Array.isArray(args.to) ? args.to : [args.to]).filter(Boolean);
    if (recipients.length === 0) return;
    const { error } = await getResend().emails.send({
      from: args.from,
      to: recipients,
      subject: args.subject,
      html: args.html,
    });
    if (error) console.error(`[email:${args.tag}] Resend rejected:`, error.message);
  } catch (error) {
    console.error(`[email:${args.tag}] failed:`, error);
  }
}

/** Founders and admins: role ADMIN plus the ADMIN_EMAIL_1/2 addresses. */
async function adminRecipients(): Promise<{ ids: string[]; emails: string[] }> {
  const extra = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2].filter((e): e is string => !!e);
  try {
    const admins = await prisma.user.findMany({
      where: { OR: [{ role: "ADMIN" }, ...(extra.length ? [{ email: { in: extra } }] : [])] },
      select: { id: true, email: true },
    });
    const emails = Array.from(new Set([...admins.map((a) => a.email), ...extra]));
    return { ids: admins.map((a) => a.id), emails };
  } catch (error) {
    console.error("[email:admins] lookup failed:", error);
    return { ids: [], emails: extra };
  }
}

// ---------------------------------------------------------------- tutors ---

/**
 * A tutor application was submitted (or re-submitted). Confirms receipt to the
 * applicant and alerts admins in-app and by email so nobody waits unseen.
 */
export async function onTutorApplicationSubmitted(applicant: {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  subjects?: string[];
}) {
  const app = getAppUrl();
  const subjects = applicant.subjects?.filter(Boolean).slice(0, 6) ?? [];

  if (applicant.email) {
    await send({
      tag: "tutor-received",
      from: FROM_TEAM,
      to: applicant.email,
      subject: "We received your Edyfra tutor application",
      html: layout(`Thanks for applying, ${firstName(applicant.name)}`, [
        "Your tutor application is in. Our team checks your ID and details, usually within 24 hours.",
        "You will get an email the moment a decision is made. You can keep using Edyfra as a student in the meantime.",
      ], { href: `${app}/onboarding/tutor-pending`, label: "Check application status" }),
    });
  }

  const admins = await adminRecipients();
  const who = esc(applicant.name || applicant.email || "A user");
  const subjectLine = subjects.length ? ` for ${subjects.map(esc).join(", ")}` : "";

  try {
    if (admins.ids.length) {
      const { notifyManyUsers } = await import("@/lib/notifications/server");
      await notifyManyUsers(admins.ids, {
        type: "ANNOUNCEMENT",
        title: "New tutor application",
        body: `${applicant.name || applicant.email || "A user"} applied to tutor${subjects.length ? ` ${subjects.join(", ")}` : ""}.`,
        actionUrl: "/admin/tutors",
      });
    }
  } catch (error) {
    console.error("[email:tutor-admin] in-app notify failed:", error);
  }

  await send({
    tag: "tutor-admin",
    from: FROM_TEAM,
    to: admins.emails,
    subject: `New tutor application: ${applicant.name || applicant.email || "new applicant"}`,
    html: layout("New tutor application", [`<strong>${who}</strong> applied to tutor${subjectLine}.`, "Review their ID and selfie to approve or reject."], {
      href: `${app}/admin/tutors`,
      label: "Review application",
    }),
  });
}

export async function sendTutorApprovedEmail(to: string | null | undefined, name: string | null | undefined) {
  if (!to) return;
  await send({
    tag: "tutor-approved",
    from: FROM_TEAM,
    to,
    subject: "You're approved to tutor on Edyfra",
    html: layout(`You're approved, ${firstName(name)}`, [
      "Your tutor application has been approved. Students can now find you and book sessions.",
      "Set your availability and hourly rate so matches start coming in.",
    ], { href: `${getAppUrl()}/tutor`, label: "Open your tutor dashboard" }),
  });
}

export async function sendTutorRejectedEmail(
  to: string | null | undefined,
  name: string | null | undefined,
  reason?: string | null,
) {
  if (!to) return;
  await send({
    tag: "tutor-rejected",
    from: FROM_TEAM,
    to,
    subject: "An update on your Edyfra tutor application",
    html: layout(`Hi ${firstName(name)}`, [
      "We couldn't approve your tutor application this time.",
      reason ? `<strong>Reason:</strong> ${esc(reason)}` : "This is usually because an ID photo or selfie was unclear or did not match.",
      "You can fix the details and apply again from your settings at any time.",
    ], { href: `${getAppUrl()}/dashboard/settings`, label: "Update and reapply" }),
  });
}

// --------------------------------------------------------------- schools ---

export async function sendInstitutionRejectedEmail(to: string | null | undefined, schoolName: string) {
  if (!to) return;
  await send({
    tag: "institution-rejected",
    from: FROM_INSTITUTIONS,
    to,
    subject: `An update on ${schoolName}'s Edyfra application`,
    html: layout("About your application", [
      `We couldn't approve <strong>${esc(schoolName)}</strong> for Edyfra Institutions this time.`,
      "Reply to this email if you think this was a mistake or want to share more details. We read every reply.",
    ]),
  });
}
