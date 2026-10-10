import { getAppUrl } from "@/lib/app-url";

/**
 * Google sign-in runs through Supabase's own OAuth broker, not a hand-rolled
 * handshake. The browser goes to Supabase, Supabase goes to Google, Google
 * comes back to `https://<project>.supabase.co/auth/v1/callback`, and Supabase
 * then bounces the browser to `redirectTo` here with a PKCE `code`.
 *
 * That broker URL is the value registered as an "Authorized redirect URI" in
 * Google Cloud Console. The Google client id/secret live in the Supabase
 * dashboard (Authentication -> Providers -> Google), NOT in this app's
 * runtime env.
 */

export const GOOGLE_PROVIDER = "google";

/** Where Supabase returns the browser once the code has been issued. */
export function getSupabaseAuthCallbackUrl(next?: string): string {
  const base = `${getAppUrl()}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

/**
 * Whether to show "Continue with Google" on the login and register pages.
 *
 * Asks Supabase itself (`/auth/v1/settings`), because that is where the
 * provider is actually switched on. This used to key off a `GOOGLE_CLIENT_ID`
 * env var that only existed in local `.env` files, so production silently hid
 * the button even though the provider was enabled in Supabase.
 *
 * The answer is cached for five minutes. If Supabase cannot be reached the
 * button is shown anyway: GoogleButton already explains a disabled provider to
 * the user, which beats hiding the option on a transient network blip.
 * `GOOGLE_SIGNIN_DISABLED=true` is a manual kill switch.
 */
export async function isGoogleSignInEnabled(): Promise<boolean> {
  if (process.env.GOOGLE_SIGNIN_DISABLED?.trim().toLowerCase() === "true") return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return true;
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.[GOOGLE_PROVIDER] !== false;
  } catch {
    return true;
  }
}

/**
 * Restricts post-login redirects to same-origin paths. Rejects
 * protocol-relative (`//evil.com`) and backslash-smuggled (`/\evil.com`)
 * targets, which browsers resolve as absolute origins — `new URL(value, base)`
 * would otherwise turn this parameter into an open redirect.
 */
export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  if (value.includes("\n") || value.includes("\r")) return "/dashboard";
  return value;
}

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  invalid_request: "That sign-in link is malformed. Try again.",
  server_error: "Our auth server had a problem. Try again in a moment.",
  temporarily_unavailable: "Sign-in is temporarily unavailable. Try again shortly.",
  signup_disabled: "New sign-ups are closed right now. Try signing in instead.",
  user_not_found: "We couldn't find an account for that Google account.",
  oauth_provider_not_supported: "Google sign-in isn't enabled yet. Use your email and password.",
  exchange_code_failed: "We couldn't complete Google sign-in. Try again, or use your email and password.",
  verification_failed: "We couldn't verify that Google sign-in. Try again.",
  no_session: "We couldn't start a session for that Google account. Try again.",
  session_not_found: "Your sign-in expired before it finished. Try again.",
  invalid_code: "That sign-in link has already been used. Try again.",
  google_not_configured: "Google sign-in isn't available right now. Use your email and password.",
  otp_expired: "That link has expired or was already used. Request a new one.",
  account_created: "Your account was created. Sign in with your email and password to continue.",
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? null;
}
