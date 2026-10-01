/**
 * Single source of truth for the public origin of the app.
 *
 * Previously every call site inlined its own `process.env.NEXT_PUBLIC_APP_URL ||
 * "https://<something>"` fallback, and they had drifted into four different
 * defaults (edyfra-v2.vercel.app, edyfra.com, edyfra.online, www.edyfra.online).
 * A stale default is invisible until it ships a wrong link to a user — a password
 * reset email pointing at a dead domain, an OAuth redirect that silently fails,
 * a sitemap built off the wrong host. So there is exactly one fallback now.
 *
 * Safe to import from client components: reads only NEXT_PUBLIC_* vars, which
 * Next.js inlines at build time.
 */

/** The domain the site is actually served from. */
export const CANONICAL_ORIGIN = "https://www.edyfra.online";

/**
 * The app's public origin, never with a trailing slash.
 *
 * `NEXT_PUBLIC_APP_URL` is checked first because the admin AI-settings page can
 * push it at runtime; `NEXT_PUBLIC_SITE_URL` is the older name and is still
 * honoured so existing deployments keep working.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_ORIGIN;
  return configured.replace(/\/+$/, "");
}
