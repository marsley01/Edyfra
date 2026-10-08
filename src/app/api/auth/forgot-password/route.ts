import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAppUrl } from "@/lib/app-url";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(254, "Email too long").toLowerCase().trim(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "If that email exists you will receive a reset link" },
        { status: 200 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${getAppUrl()}/auth/callback?next=/update-password`,
      },
    );

    // GoTrue never errors for an unknown address, so surfacing failures here
    // does not reveal whether an account exists. Swallowing them did hide real
    // outages: a rate limit or a failing Send Email hook still told the user to
    // "check your email" for a message that was never sent.
    if (error) {
      console.error("[Auth] Password reset error:", error.status, error.code, error.message);
      if (error.status === 429 || /rate limit/i.test(error.message)) {
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

    return NextResponse.json(
      { message: "If that email exists you will receive a reset link" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "If that email exists you will receive a reset link" },
      { status: 200 },
    );
  }
}
