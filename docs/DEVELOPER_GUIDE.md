# Developer Guide

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (Supabase)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/edyfra.git
cd edyfra

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in your environment variables

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Start development server
npm run dev
```

## Development Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
npm run db:studio    # Open Prisma Studio
```

## Project Conventions

### Creating a New Page

1. Create folder in `src/app/` matching the route
2. Add `page.tsx` for the page component
3. Add `layout.tsx` if nested layout needed
4. Add `loading.tsx` for loading state
5. Add `error.tsx` for error boundary

### Creating a Server Action

1. Add function in `src/app/actions/<domain>.ts`
2. Mark with `"use server"`
3. Use `requireAuth()` for protected actions
4. Return `{ error?: string }` or `{ success: true, data?: T }`
5. Add Zod validation for all inputs

### Creating an API Route

1. Create folder in `src/app/api/<name>/`
2. Add `route.ts` with exported HTTP handlers
3. Use `getAuthenticatedUser()` for auth
4. Use `createApiResponse()` / `createApiError()` for responses

### Adding a Database Model

1. Add model to `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or create migration

## Testing

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
```

## Architecture Decisions

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

## Common Tasks

### Add a new environment variable
1. Add to `.env.example` with documentation
2. Add to appropriate Supabase/Prisma config
3. Document in `docs/DEPLOYMENT.md`

### Debug a Server Action
1. Check `src/app/actions/<domain>.ts` for the action
2. Add `log("info", "debug message", { data })` for debugging
3. Check browser network tab for server action responses

### Debug an API Route
1. Check `src/app/api/<name>/route.ts`
2. Test with curl or Postman
3. Check server logs for errors
