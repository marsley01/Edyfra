import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updatePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid password" },
        { status: 400 },
      );
    }

    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to update password. The link may have expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
