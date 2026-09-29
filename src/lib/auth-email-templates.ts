/**
 * Branded HTML for Supabase Auth "Send Email" hook emails.
 *
 * Deliberately not a React Email dependency: these are rendered on the server
 * inside a 5-second webhook budget, and a plain string template is faster and
 * has no runtime cost.
 *
 * Every interpolated value is escaped. `user_metadata.name` is user-controlled
 * (anyone can set arbitrary metadata at signup), and `actionUrl` is built from
 * a Supabase-supplied redirect_to, so neither may be trusted as HTML.
 */

const BRAND = {
  ink: "#0f172a",
  body: "#1e293b",
  muted: "#64748b",
  faint: "#94a3b8",
  surface: "#f8fafc",
  border: "#e2e8f0",
  accent: "#2563eb",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only ever render a first name; fall back to something neutral. */
function safeFirstName(raw: unknown): string {
  if (typeof raw !== "string") return "there";
  const first = raw.trim().split(/\s+/)[0] ?? "";
  // Strip control characters and cap the length before escaping.
  const cleaned = first.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 40);
  return cleaned ? escapeHtml(cleaned) : "there";
}

interface ShellOptions {
  heading: string;
  preview: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}

function shell({ heading, preview, bodyHtml, ctaLabel, ctaUrl, footnote }: ShellOptions) {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:${BRAND.ink};padding:28px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.03em;">Edyfra</span>
              <span style="color:${BRAND.faint};font-size:13px;margin-left:10px;">Kenya's institutional study platform</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 16px 0;color:${BRAND.ink};font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1.25;">${escapeHtml(heading)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              <a href="${safeUrl}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;padding:15px 34px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">${escapeHtml(ctaLabel)}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 32px 36px 32px;">
              <p style="margin:0;color:${BRAND.faint};font-size:12px;line-height:1.6;">${escapeHtml(footnote)}</p>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.surface};padding:20px 32px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
                This link expires in 60 minutes and can only be used once.
                If the button does not work, copy this URL into your browser:
              </p>
              <p style="margin:8px 0 0 0;color:${BRAND.muted};font-size:11px;word-break:break-all;line-height:1.5;">${safeUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px 32px;">
              <p style="margin:0;color:${BRAND.faint};font-size:11px;line-height:1.6;text-align:center;">
                &copy; ${new Date().getFullYear()} Edyfra Platforms. Nairobi, Kenya.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildSignupEmail(params: { name: unknown; actionUrl: string }) {
  const name = safeFirstName(params.name);
  return {
    subject: "Confirm your Edyfra account",
    html: shell({
      heading: `Welcome, ${name}`,
      preview: "Confirm your email address to finish setting up your Edyfra account.",
      bodyHtml: `<p style="margin:0 0 14px 0;color:${BRAND.body};font-size:16px;line-height:1.65;">
          Thanks for creating an Edyfra account. Confirm your email address to unlock the dashboard, live study rooms and your tutor matches.
        </p>
        <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
          Confirming takes a few seconds and keeps your account secure.
        </p>`,
      ctaLabel: "Confirm my email",
      ctaUrl: params.actionUrl,
      footnote: "Didn't create an Edyfra account? You can safely ignore this email.",
    }),
  };
}

export function buildRecoveryEmail(params: { actionUrl: string }) {
  // Intentionally does not confirm whether an account exists, matching the
  // non-enumerating wording already used by the /forgot-password page.
  return {
    subject: "Reset your Edyfra password",
    html: shell({
      heading: "Reset your password",
      preview: "A password reset was requested for your Edyfra account.",
      bodyHtml: `<p style="margin:0 0 14px 0;color:${BRAND.body};font-size:16px;line-height:1.65;">
          We received a request to reset the password on your Edyfra account. Use the button below to choose a new one.
        </p>
        <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
          Your current password stays active until you finish.
        </p>`,
      ctaLabel: "Choose a new password",
      ctaUrl: params.actionUrl,
      footnote: "If you didn't request this, no action is needed and your password is unchanged.",
    }),
  };
}
