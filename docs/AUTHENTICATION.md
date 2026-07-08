# Authentication

## Architecture

Edyfra uses **Supabase Auth** with **PKCE flow** for secure session management. All session handling is done server-side through Next.js middleware and cookies.

```
Browser ───► Next.js ───► Supabase Auth
  │              │              │
  │    Cookies   │    API Key   │
  └──────────────┴──────────────┘
```

## Auth Flow

### Sign Up
1. User submits email + password via Server Action
2. Supabase creates user, sends confirmation email
3. On confirmation, user is redirected to `/auth/callback`
4. Prisma user record is created/upserted
5. User is redirected to `/onboarding`

### Sign In
1. User submits credentials via Server Action
2. Supabase validates and returns session
3. Prisma user data is synced to Supabase metadata
4. Role-based redirect: `/dashboard`, `/tutor`, or `/admin`

### Session Management
- Sessions are managed via `@supabase/ssr` with cookie-based storage
- Middleware (`src/middleware.ts`) refreshes sessions on every request
- Protected routes check session in Server Actions via `createClient()`

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/supabase/server.ts` | Server-side Supabase client |
| `src/utils/supabase/client.ts` | Client-side Supabase client |
| `src/utils/supabase/middleware.ts` | Middleware session handler |
| `src/middleware.ts` | Session refresh, CORS, CSRF, rate limiting |
| `src/app/actions/auth.ts` | Login, signup, logout server actions |
| `src/lib/auth.ts` | Reusable auth helpers (`requireAuth`, `requireUser`, `requireRole`) |

## Server Actions vs API Routes

- **Server Actions** — used for all user-facing mutations (login, signup, profile updates)
- **API Routes** — used for external integrations (M-Pesa webhooks, Stream webhooks)

## Security Measures

- **Rate Limiting** — Upstash Redis-based rate limiting on auth endpoints
- **CSRF Protection** — Origin/referer validation for mutation requests
- **CORS** — Explicit allowed origin list
- **Security Headers** — CSP, X-Frame-Options, X-Content-Type-Options
- **Input Validation** — Zod schemas for all auth inputs
- **Session Refresh** — Automatic in middleware

## Reusable Auth Helpers

```typescript
import { requireAuth, requireUser, requireRole } from "@/lib/auth";

// Just need a logged-in user
const { user } = await requireAuth();

// Need the Prisma user record
const { prismaUser } = await requireUser();

// Need specific role
const { prismaUser } = await requireRole("ADMIN", "FOUNDER");
```
