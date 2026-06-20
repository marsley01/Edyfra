import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Sentry is automatically injected via the `sentry.server.config.ts` file, 
    // but Next.js 15+ needs this file present.
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime
  }
}
