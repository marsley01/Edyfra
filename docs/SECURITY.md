# Security

## Overview

Edyfra follows security best practices for a production education platform. This document outlines the security measures in place and how they are implemented.

## Authentication & Authorization

- **Supabase Auth** — handles password hashing, session management, OAuth
- **Row-Level Security** — PostgreSQL RLS policies enforce data isolation
- **Role-Based Access** — Student, Tutor, Admin, Founder roles with appropriate guards
- **Server Actions** — all mutations run server-side; client never has DB access
- **Session Refresh** — automatic via middleware on every request

## Input Validation

- **Zod schemas** — all auth inputs validated via `src/lib/validation/schemas.ts`
- **DOMPurify** — all user-generated content sanitized before rendering
- **Filename sanitization** — upload filenames cleaned to prevent path traversal
- **SQL injection** — prevented by Prisma ORM (parameterized queries)

## Request Security

| Measure | Implementation |
|---------|---------------|
| CORS | Explicit allowed origins in middleware |
| CSRF | Origin + Referer validation on mutation requests |
| Rate Limiting | Upstash Redis-based, per-endpoint limits |
| Security Headers | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| HTTPS | Enforced by Vercel platform |

## Data Protection

- **No secrets in client code** — all secrets in server-only env vars
- **Minimal exposure** — API endpoints only return necessary data
- **Secure cookies** — Supabase SSR uses httpOnly, secure, sameSite cookies
- **No console.log in production** — structured logging via `logger.ts`

## Payment Security

M-Pesa integration follows Safaricom's security guidelines:
- STK Push initiated server-side
- Callback URL validates IP against allowed ranges
- B2C uses RSA-encrypted security credential
- Transaction records stored server-side only

## API Key Management

All API keys stored as environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` — server-only
- `STREAM_SECRET` — server-only
- `OPENROUTER_API_KEY` — server-only
- `RESEND_API_KEY` — server-only
- `NEXT_PUBLIC_*` — public (safe for client)

## Vulnerability Reporting

See `SECURITY.md` in the repository root for reporting vulnerabilities.

## Future Improvements

- Add API key rotation automation
- Implement audit logging for admin actions
- Add WebAuthn/passkey support
- Implement session invalidation on password change
- Add rate limiting for AI endpoint
