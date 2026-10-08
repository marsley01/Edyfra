import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit, getRateLimitKey, getConfig } from '@/lib/rate-limit'

const ALLOWED_ORIGINS = [
  'https://www.edyfra.online',
  'https://edyfra.online',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.EXTERNAL_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || []),
]

// Signed-in-only areas. Layouts still enforce roles; this only stops anonymous
// visitors from rendering a half-loaded private page.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/tutor',
  '/admin',
  '/onboarding',
  '/study-room',
  '/institution/dashboard',
]

const SERVER_ACTION_LIMIT = { interval: 60_000, maxRequests: 20 };

// Mutation methods that require CSRF protection
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Canonicalize an origin so that `www.example.com` and `example.com` compare
 * equal.
 *
 * Browsers treat the two as *distinct* origins, so a literal string allowlist
 * silently rejects whichever form is not listed — 403ing every /api route and
 * returning an empty 204 on every server action, with no error surfaced to the
 * user. Stripping a single leading `www.` label removes that whole class of
 * failure.
 *
 * Security: this is exact-equality comparison on the normalized form, never
 * substring or suffix matching. `https://www.evil.com` normalizes to
 * `https://evil.com`, which still has to match an allowlist entry exactly to be
 * accepted, and `https://edyfra.online.evil.com` never matches. Protocol and
 * port are preserved, so `http://localhost:3000` does not match
 * `https://localhost:3000`.
 */
function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./i, '');
    return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    return null;
  }
}

/** True only when `value` exactly matches an allowlist entry after normalization. */
function isOriginAllowed(value: string | null, allowlist: string[]): boolean {
  if (!value) return false;
  const normalized = normalizeOrigin(value);
  if (!normalized) return false;
  return allowlist.some((entry) => normalizeOrigin(entry) === normalized);
}

function setCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigin = isOriginAllowed(origin, ALLOWED_ORIGINS) ? origin! : ALLOWED_ORIGINS[0]
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  return response
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.edyfra.online';
}

function validateCsrf(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) return false;

  const appUrl = getAppUrl();
  const allowedUrls = [appUrl, ...ALLOWED_ORIGINS];

  return isOriginAllowed(origin, allowedUrls) || isOriginAllowed(referer, allowedUrls);
}

export async function proxy(request: NextRequest) {
  const url = new URL(request.url)
  const isApiRoute = url.pathname.startsWith('/api/')
  const origin = request.headers.get('origin')

  // Force HTTPS on any non-local host (Vercel already does this at the edge,
  // this also covers custom hosts / direct HTTP traffic)
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = request.nextUrl.hostname
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  if (proto === 'http' && !isLocalHost) {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https'
    return NextResponse.redirect(httpsUrl, 308)
  }

  // Supabase falls back to the Site URL (the home page) when a redirect target
  // is missing from its allowlist, so OAuth/reset codes landed on `/?code=...`
  // and were never exchanged — the user simply stayed signed out. Hand them to
  // the callback that performs the exchange.
  if (url.pathname === '/' && url.searchParams.has('code') && request.method === 'GET') {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  // CSRF check for mutation requests on non-API routes (server actions)
  if (MUTATION_METHODS.has(request.method) && request.headers.get('content-type')?.includes('text/plain')) {
    if (!validateCsrf(request)) {
      return new NextResponse(null, { status: 204 });
    }
  }

  // CORS preflight for API routes
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return setCorsHeaders(response, origin)
  }

  // CORS + rate limiting for API routes
  if (isApiRoute) {
    if (origin && !isOriginAllowed(origin, ALLOWED_ORIGINS)) {
      const response = NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
      return setCorsHeaders(response, origin)
    }

    const isServerAction = request.method === 'POST' && request.headers.get('next-action') !== null
    const key = isServerAction
      ? `sa:${getRateLimitKey(request)}`
      : getRateLimitKey(request)
    const config = isServerAction ? SERVER_ACTION_LIMIT : getConfig(url.pathname)
    const result = config ? await rateLimit(key, config) : null

    if (config && result && !result.success) {
      const body = isServerAction
        ? { error: 'Too many requests. Please slow down and try again.' }
        : { error: 'Too many requests. Please try again later.' }
      const response = NextResponse.json(body, {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      })
      return setCorsHeaders(response, origin)
    }
  }

  // Forward the pathname to server components. Layouts have no access to the
  // route they are rendering, but the dashboard layout needs to know whether the
  // current request is for /dashboard/settings so an account that has not
  // finished onboarding can still reach the page that lets them finish.
  // `set` (not `append`) deliberately overwrites any client-supplied value so
  // the header can only ever describe the real path. This is a UX gate, never
  // an authorization boundary — every page and server action re-checks the
  // session independently.
  request.headers.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({ request })

  // getAll/setAll is the only cookie API @supabase/ssr supports correctly. The
  // old get/set/remove form rebuilt the response on every `set`, so when a
  // refreshed session was split across chunked cookies only the last chunk
  // survived — users were logged out at random.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = path.startsWith('/institution/') ? '/auth/institution-login' : '/auth/login'
    redirectUrl.search = ''
    const redirect = NextResponse.redirect(redirectUrl)
    // Carry over any cookie changes (e.g. a cleared, expired session).
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  // Add security headers to all responses
  if (isApiRoute) {
    return setCorsHeaders(supabaseResponse, origin)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
