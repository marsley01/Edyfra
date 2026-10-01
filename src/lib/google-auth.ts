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
 * runtime env — `GOOGLE_CLIENT_ID` is only used here as the operator's signal
 * that the provider was configured, so the button can be hidden when it was not.
 */

export const GOOGLE_PROVIDER = "google";

/** Where Supabase returns the browser once the code has been issued. */
export function getSupabaseAuthCallbackUrl(next?: string): string {
  const base = `${getAppUrl()}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export function isGoogleSignInEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
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
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? null;
}
