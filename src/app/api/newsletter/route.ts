import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { email, source = "landing_page" } = body;

    // Validate email format
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Insert to newsletter_subscribers table (upsert to avoid duplicate errors)
    const { error } = await getAdminClient()
      .from("newsletter_subscribers")
      .upsert(
        {
          email: normalizedEmail,
          subscribed_at: new Date().toISOString(),
          source,
        },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (error) {
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
