import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { rateLimit, getRateLimitKey, getConfig } from '@/lib/rate-limit'

const SERVER_ACTION_LIMIT = { interval: 60_000, maxRequests: 20 };

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const isApiRoute = url.pathname.startsWith('/api/');
  const isServerAction = request.method === 'POST' && request.headers.get('next-action') !== null;

  if (isApiRoute || isServerAction) {
    const key = isServerAction
      ? `sa:${getRateLimitKey(request)}`
      : getRateLimitKey(request);
    const config = isServerAction ? SERVER_ACTION_LIMIT : getConfig(url.pathname);
    const result = await rateLimit(key, config);

    if (!result.success) {
      const body = isServerAction
        ? { error: 'Too many requests. Please slow down and try again.' }
        : { error: 'Too many requests. Please try again later.' };
      return NextResponse.json(body, {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      });
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
