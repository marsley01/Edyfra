import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Structural email check — linear time, immune to ReDoS. Replaces the old
 * backtracking regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ which CodeQL flagged as
 * polynomial on crafted input.
 */
function isValidEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (!local || !domain) return false;
  if (/[\s@]/.test(local) || /[\s@]/.test(domain)) return false;
  return dot > 0 && dot < domain.length - 1;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/newsletter
 * Saves a newsletter subscriber to Supabase.
 * Validates email format, then upserts to newsletter_subscribers table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 64)
        : "landing_page";

    // Validate email format
    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // newsletter_subscribers has no unique constraint on email, so the old
    // `upsert(..., { onConflict: "email" })` was rejected by Postgres ("no
    // unique or exclusion constraint matching the ON CONFLICT specification")
    // and every signup failed. Look up first, then insert.
    const admin = getAdminClient();
    const { data: existing, error: lookupError } = await admin
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1);

    if (lookupError) {
      console.error("[Newsletter] Supabase lookup error:", lookupError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    const { error } = await admin.from("newsletter_subscribers").insert({
      email: normalizedEmail,
      subscribed_at: new Date().toISOString(),
      source,
    });

    // 23505 = a concurrent request (or a future unique index) already added it.
    if (error && error.code !== "23505") {
      // Never expose the database error to the client
      console.error("[Newsletter] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[Newsletter] Subscribed: ${normalizedEmail} from ${source}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Newsletter] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
