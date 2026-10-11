import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAppUrl } from "@/lib/app-url";
import { sendAuthEmail } from "@/lib/auth-emails";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(254, "Email too long").toLowerCase().trim(),
});

const GENERIC_OK = { message: "If that email exists you will receive a reset link" };

/**
 * Password reset.
 *
 * This used to call `resetPasswordForEmail`, which makes Supabase deliver the
 * email through the project's "Send Email" hook. When that hook is misconfigured
 * (missing secret or Resend key on the deployment) Supabase fails the whole
 * request, and no user could reset their password.
 *
 * Now the route asks Supabase only for the one-time recovery token
 * (`admin.generateLink`, which never calls the hook) and sends the email itself
 * through Resend. The link goes to /auth/verify, which exchanges the token for
 * a session and continues to /update-password.
 *
 * Unknown addresses get the same response as known ones so the endpoint cannot
 * be used to discover who has an account. The proxy rate-limits /api routes.
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json(GENERIC_OK, { status: 200 });
    email = parsed.data.email;
  } catch {
    return NextResponse.json(GENERIC_OK, { status: 200 });
  }

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    if (error.status === 404 || error.code === "user_not_found") {
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }
    console.error("[Auth] generateLink(recovery) failed:", error.status, error.code, error.message);
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Too many reset requests. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't send the reset email right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) {
    console.error("[Auth] generateLink(recovery) returned no hashed_token");
    return NextResponse.json(
      { error: "We couldn't send the reset email right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  try {
    await sendAuthEmail({ to: email, type: "recovery", tokenHash, redirectTo: getAppUrl() });
  } catch (sendError) {
    console.error("[Auth] reset email delivery failed:", sendError);
    return NextResponse.json(
      { error: "We couldn't send the reset email right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  return NextResponse.json(GENERIC_OK, { status: 200 });
}
