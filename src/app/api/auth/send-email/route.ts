import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { buildSignupEmail, buildRecoveryEmail } from "@/lib/auth-email-templates";

export const runtime = "nodejs";

/**
 * Supabase Auth "Send Email" hook.
 *
 * Supabase POSTs a Standard Webhooks-signed JSON event here for every auth
 * email, and we deliver it through Resend instead of Supabase's rate-limited
 * default SMTP.
 *
 * Response contract (per Supabase auth-hooks docs):
 *   200            success
 *   400 / 403      treated as a non-retryable 500 by Supabase
 *   429 / 503      retryable - 3 attempts, 2s backoff, 5s total budget
 * Every response must be application/json, including errors, or Supabase
 * treats the hook as having failed.
 */

const TOLERANCE_SECONDS = 300;

interface EmailData {
  email_action_type: string;
  token_hash: string;
  redirect_to: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

interface HookPayload {
  user: { email?: string; user_metadata?: Record<string, unknown> };
  email_data: EmailData;
}

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

/**
 * Reads the hook secret(s). The plural form is pipe-separated so a secret can
 * be rotated without downtime - a request signed with either the old or the
 * new key verifies.
 */
function readSecrets(): Buffer[] {
  const raw = process.env.SEND_EMAIL_HOOK_SECRETS || process.env.SEND_EMAIL_HOOK_SECRET;
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Buffer.from(s.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64"));
}

/**
 * Standard Webhooks signature verification.
 *
 * Signed content is `${webhook-id}.${webhook-timestamp}.${body}`, HMAC-SHA256,
 * base64-encoded, compared in constant time. `body` must be the raw request
 * text: re-serializing parsed JSON changes the bytes and breaks verification.
 */
function verifySignature(secrets: Buffer[], headers: Headers, body: string): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;

  // Replay protection: reject anything outside the tolerance window.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const signed = `${id}.${timestamp}.${body}`;
  const expected = secrets.map((secret) =>
    createHmac("sha256", secret).update(signed).digest("base64"),
  );

  return signature.split(" ").some((candidate) => {
    const value = candidate.startsWith("v1,") ? candidate.slice(3) : candidate;
    return expected.some((want) => {
      const a = Buffer.from(value);
      const b = Buffer.from(want);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  });
}

function buildActionUrl(supabaseUrl: string, data: EmailData): string {
  const params = new URLSearchParams({
    token: data.token_hash,
    type: data.email_action_type,
    redirect_to: data.redirect_to,
  });
  return `${supabaseUrl.replace(/\/$/, "")}/auth/v1/verify?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  // Supabase may probe the endpoint; only POST is meaningful.
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secrets = readSecrets();
  if (secrets.length === 0) {
    console.error("[send-email] SEND_EMAIL_HOOK_SECRETS is not configured");
    // 500-class: a configuration fault, not a bad request from Supabase.
    return json({ error: "Hook secret not configured" }, 503, { "retry-after": "true" });
  }

  // Read once, verify the exact bytes, then parse.
  const body = await request.text();

  if (!verifySignature(secrets, request.headers, body)) {
    console.warn("[send-email] rejected: invalid or missing webhook signature");
    return json({ error: "Invalid signature" }, 401);
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(body) as HookPayload;
  } catch {
    console.warn("[send-email] rejected: body was not valid JSON");
    return json({ error: "Invalid payload" }, 400);
  }

  const { user, email_data: data } = payload ?? {};
  const to = user?.email;
  if (!to || !data?.email_action_type || !data?.token_hash) {
    console.warn("[send-email] rejected: payload missing required fields");
    return json({ error: "Invalid payload" }, 400);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qwwuniqsjtgkvfdqjcrs.supabase.co";

  let message: { subject: string; html: string } | null = null;

  switch (data.email_action_type) {
    case "signup": {
      const actionUrl = buildActionUrl(supabaseUrl, data);
      message = buildSignupEmail({ name: user.user_metadata?.name, actionUrl });
      break;
    }
    case "recovery": {
      const actionUrl = buildActionUrl(supabaseUrl, data);
      message = buildRecoveryEmail({ actionUrl });
      break;
    }
    default: {
      // Not yet handled. Return 200 so enabling this hook does not break
      // magiclink, invite, email_change or the notification types.
      console.warn(
        `[send-email] no template for email_action_type="${data.email_action_type}" - not sending`,
      );
      return json({ skipped: data.email_action_type }, 200);
    }
  }

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      console.error("[send-email] Resend error:", error.message);
      // 503 + retry-after: Supabase retries up to 3 times.
      return json({ error: "Email provider rejected the request" }, 503, {
        "retry-after": "true",
      });
    }
  } catch (error) {
    console.error("[send-email] send failed:", error);
    return json({ error: "Email provider unavailable" }, 503, { "retry-after": "true" });
  }

  return json({}, 200);
}
