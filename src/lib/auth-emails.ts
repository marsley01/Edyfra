import { getResend } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

/**
 * Auth email templates for the Supabase "Send Email" hook.
 *
 * Supabase delegates every transactional auth email (recovery, email change,
 * signup confirmation) to this project and then waits for a 2xx. If the hook
 * cannot deliver, GoTrue fails the whole request with
 * `unexpected_failure: Unexpected status code returned from hook`, so a user
 * never receives a link and the UI cannot tell them why.
 *
 * Delivery goes through Resend. Every template is plain HTML with no remote
 * images or scripts so it renders in Outlook and Gmail without a bundler.
 */

const FROM = process.env.AUTH_EMAIL_FROM || "Edyfra <no-reply@edyfra.online>";

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
        <tr><td>
          <p style="margin:0 0 24px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0f172a">Edyfra</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a">${title}</h1>
          ${body}
          <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">
            If you did not request this, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px">${label}</a>`;
}

export type AuthEmailType =
  | "recovery"
  | "email_change"
  | "signup"
  | "invite"
  | "magiclink"
  | "email";

interface SendAuthEmailArgs {
  to: string;
  type: AuthEmailType;
  /** Verifier for `supabase.auth.verifyOtp({ token_hash })`. */
  tokenHash: string;
  redirectTo: string;
  /** For `email_change`: the address being moved to, when `to` is the old one. */
  newEmail?: string;
}

export async function sendAuthEmail({
  to,
  type,
  tokenHash,
  redirectTo,
  newEmail,
}: SendAuthEmailArgs): Promise<void> {
  // `redirectTo` originates from the Supabase Site URL / redirect allowlist, so
  // only its origin is reused and the verifier is appended to our own verify
  // route. That keeps a misconfigured allowlist from turning the hook into an
  // open redirect for live session tokens.
  const target = new URL(redirectTo || getAppUrl());
  const verifyUrl = new URL(`${target.origin}/auth/verify`);
  verifyUrl.searchParams.set("token_hash", tokenHash);
  verifyUrl.searchParams.set("type", type);

  const link = verifyUrl.toString();

  let subject: string;
  let title: string;
  let body: string;

  switch (type) {
    case "recovery":
      subject = "Reset your Edyfra password";
      title = "Reset your password";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Click the button below to choose a new password. This link works once and expires shortly.</p>${button(link, "Reset password")}`;
      break;
    case "email_change":
      subject = "Confirm your new Edyfra email";
      title = "Confirm your new email";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Confirm this address to finish moving your Edyfra account to <strong>${escapeHtml(newEmail || to)}</strong>. Until you confirm, your old address stays active.</p>${button(link, "Confirm email")}`;
      break;
    case "signup":
      subject = "Confirm your Edyfra account";
      title = "Welcome to Edyfra";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Confirm your email to activate your account and start learning.</p>${button(link, "Confirm account")}`;
      break;
    case "invite":
      subject = "You have been invited to Edyfra";
      title = "You are invited";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Accept the invitation to join Edyfra.</p>${button(link, "Accept invitation")}`;
      break;
    case "magiclink":
      subject = "Your Edyfra sign-in link";
      title = "Here's your sign-in link";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Click below to sign in. This link works once and expires shortly.</p>${button(link, "Sign in")}`;
      break;
    default:
      subject = "Your Edyfra verification code";
      title = "Confirm it's you";
      body = `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Use this code to confirm your email address. It expires shortly.</p><p style="margin:0;font-size:32px;font-weight:800;letter-spacing:.2em;color:#0f172a">${escapeHtml(tokenHash)}</p>`;
  }

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html: shell(title, body),
  });

  if (error) {
    throw new Error(`Resend rejected the send: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
