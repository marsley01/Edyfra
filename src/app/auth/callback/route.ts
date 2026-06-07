import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Supabase OAuth / email-confirm / password-reset landing.
 *
 * Supabase sends users here with either:
 *   • ?code=...        (PKCE flow — exchange for a session, then redirect)
 *   • #access_token=...&type=recovery   (legacy implicit flow — handled client side)
 *
 * For the PKCE path we exchange the code, then bounce them to `?next=...`
 * (or `/dashboard` by default). For the implicit path we render a tiny client
 * shim that lets supabase-js pick up the hash and route the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // If Supabase explicitly told us it failed, surface a friendly error.
  if (error) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("auth_error", errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const redirectUrl = new URL("/login", origin);
      redirectUrl.searchParams.set(
        "auth_error",
        exchangeError.message || "We couldn't finish signing you in.",
      );
      return NextResponse.redirect(redirectUrl);
    }
    // Only allow same-origin relative paths to prevent open redirects.
    const safeNext = next.startsWith("/") ? next : "/dashboard";
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  // No code? Could be the legacy hash flow — bounce to the client shim page.
  const redirectUrl = new URL("/auth/callback/handle", origin);
  redirectUrl.searchParams.set("next", next);
  return NextResponse.redirect(redirectUrl);
}
