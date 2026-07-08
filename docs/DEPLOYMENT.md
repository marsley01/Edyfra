# Deployment

## Platform

Edyfra is designed for **Vercel** deployment with the following configuration:

```json
// vercel.json
{ "regions": ["lhr1"] }  // London region for Kenya latency
```

## Prerequisites

1. **Vercel account** with team/project configured
2. **Supabase project** (Database + Auth + Storage)
3. **Stream** application for chat/video
4. **Upstash** Redis database for rate limiting
5. **Resend** API key for email
6. **OpenRouter** or **Google AI** API key for AI features
7. **M-Pesa** developer credentials (optional)

## Environment Variables

Copy `.env.example` and configure all variables. See [Environment Variables](#environment-variables) section in README.

## Deploy Steps

### 1. Database Setup

```bash
# Push Prisma schema to Supabase PostgreSQL
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init

# Run Supabase migrations
node scripts/run-migration.mjs supabase/migrations/<file>.sql
```

### 2. Build & Deploy

```bash
# Vercel CLI
vercel --prod

# Or connect GitHub repo to Vercel for auto-deploy
```

### 3. Post-Deployment

- Verify health endpoint: `GET /api/health`
- Test authentication flow
- Configure custom domain in Vercel dashboard
- Set up monitoring (Vercel Analytics + Speed Insights are built-in)

## CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- **`ci.yml`** — Lint, typecheck, and build on every PR
- **`test.yml`** — Run test suite
- **`codeql.yml`** — CodeQL security analysis

## Production Checklist

See `DEPLOYMENT_CHECKLIST.md` for a detailed production readiness checklist.
