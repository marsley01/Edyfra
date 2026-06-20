import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { rateLimit, getRateLimitKey, getConfig } from '@/lib/rate-limit'

const ALLOWED_ORIGINS = [
  'https://edyfra-v2.vercel.app',
  'https://edyfra.com',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
]

const SERVER_ACTION_LIMIT = { interval: 60_000, maxRequests: 20 };

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

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const isApiRoute = url.pathname.startsWith('/api/')
  const origin = request.headers.get('origin')

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

  const response = await updateSession(request)

  // Add security headers to all responses
  if (isApiRoute) {
    return setCorsHeaders(response, origin)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
