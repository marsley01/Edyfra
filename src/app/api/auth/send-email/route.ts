import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { sendAuthEmail, type AuthEmailType } from "@/lib/auth-emails";

export const runtime = "nodejs";

/**
 * Supabase "Send Email" hook.
 *
 * Supabase delegates all transactional auth email here and requires a 2xx. This
 * is what keeps password reset, email-change confirmation, and signup
 * confirmation working on Resend instead of the rate-limited built-in SMTP.
 *
 * Requests are signed with the project's Send Email Hook secret. Verification is
 * mandatory: this endpoint will happily mail an attacker-supplied address if
 * left open, which makes the project an open relay and burns your Resend quota.
 *
 * Configure in the Supabase dashboard:
 *   Authentication -> Hooks -> Send Email
 *   URL:      https://<your-domain>/api/auth/send-email
 *   Secret:   SEND_EMAIL_HOOK_SECRETS
 */

const TOLERANCE_SECONDS = 300;

const SUPPORTED = new Set<AuthEmailType>([
  "recovery",
  "email_change",
  "signup",
  "invite",
  "magiclink",
  "email",
]);

interface HookPayload {
  user?: { email?: string; new_email?: string };
  email_data?: {
    token_hash?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
  };
}

function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Verify the `svix-*` signature triple Supabase sends.
 *
 * Format: base64(HMAC-SHA256(secret, `${svix-id}.${svix-timestamp}.${rawBody}`)),
 * prefixed with the key id, e.g. `v1,<base64>`. Signing the raw body means the
 * digest covers the exact bytes, so a re-serialized payload fails.
 */
function verifySignature(headers: Headers, rawBody: string): boolean {
  const secret = process.env.SEND_EMAIL_HOOK_SECRETS;
  if (!secret) {
    console.error("[auth/send-email] SEND_EMAIL_HOOK_SECRETS is not set");
    return false;
  }

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    console.error("[auth/send-email] signature timestamp outside tolerance");
    return false;
  }

  // The env var may carry several keys as `v1,whsec_x` or `whsec_x,whsec_y`.
  const secretPart = secret.includes(",") ? secret.split(",")[1] : secret;
  const key = Buffer.from(secretPart.replace(/^whsec_/, ""), "base64");

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // svix sends one or more `v1,<base64>` signatures separated by SPACES, so the
  // header must be split on whitespace first — splitting on "," would leave
  // bare key ids and never match.
  const candidates = signature
    .trim()
    .split(/\s+/)
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  if (candidates.length === 0) return false;

  return candidates.some((provided) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(request.headers, rawBody)) {
    return fail("Invalid signature", 401);
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody) as HookPayload;
  } catch {
    return fail("Malformed payload", 400);
  }

  const to = payload.user?.email;
  const tokenHash = payload.email_data?.token_hash;
  const actionType = payload.email_data?.email_action_type as AuthEmailType | undefined;

  if (!to || !tokenHash || !actionType) {
    return fail("Missing email, token_hash, or email_action_type", 400);
  }

  if (!SUPPORTED.has(actionType)) {
    return fail(`Unsupported email_action_type: ${actionType}`, 400);
  }

  try {
    if (actionType === "email_change" && payload.user?.new_email) {
      // The confirmation belongs at the NEW address — sending it to `user.email`
      // asked the old inbox to approve the move. With "secure email change" on,
      // GoTrue also issues `token_hash_new`, and both inboxes must confirm.
      await sendAuthEmail({
        to: payload.user.new_email,
        type: actionType,
        tokenHash,
        redirectTo: payload.email_data?.redirect_to || "",
      });
      const currentHash = payload.email_data?.token_hash_new;
      if (currentHash) {
        await sendAuthEmail({
          to,
          type: actionType,
          tokenHash: currentHash,
          redirectTo: payload.email_data?.redirect_to || "",
          newEmail: payload.user.new_email,
        });
      }
    } else {
      await sendAuthEmail({
        to,
        type: actionType,
        tokenHash,
        redirectTo: payload.email_data?.redirect_to || "",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Surfaced so the failure is visible in Supabase's hook logs rather than
    // silently dropping the user's only route back into their account.
    console.error("[auth/send-email] delivery failed:", error);
    return fail("Delivery failed", 500);
  }
}
