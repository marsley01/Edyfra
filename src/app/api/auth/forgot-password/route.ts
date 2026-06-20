import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://edyfra-v2.vercel.app"}/auth/callback?next=/update-password`,
      },
    );

    if (error) {
      console.error("[Auth] Password reset error:", error.message);
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
