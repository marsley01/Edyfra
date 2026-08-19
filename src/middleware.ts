import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { rateLimit, getRateLimitKey, getConfig } from '@/lib/rate-limit'

const ALLOWED_ORIGINS = [
  'https://edyfra-v2.vercel.app',
  'https://edyfra.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.EXTERNAL_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || []),
]

const SERVER_ACTION_LIMIT = { interval: 60_000, maxRequests: 20 };

// Mutation methods that require CSRF protection
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function setCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
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
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://edyfra.com';
}

function validateCsrf(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) return false;

  const appUrl = getAppUrl();
  const allowedUrls = [appUrl, ...ALLOWED_ORIGINS];

  const isValidOrigin = !!origin && allowedUrls.some(u => {
    try { return new URL(origin).origin === new URL(u).origin; } catch { return false; }
  });
  const isValidReferer = !!referer && allowedUrls.some(u => {
    try { return new URL(referer).origin === new URL(u).origin; } catch { return false; }
  });

  return isValidOrigin || isValidReferer;
}

export async function middleware(request: NextRequest) {
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
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
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
    const result = await rateLimit(key, config)

    if (!result.success) {
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

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/institution/dashboard'))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    return NextResponse.redirect(redirectUrl)
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
