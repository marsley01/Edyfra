Edyfra Vercel Deployment Checklist

1. Required Environment Variables (set in Vercel > Project > Settings > Environment Variables):
   - DATABASE_URL
   - DIRECT_URL (optional, if using)
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - OPENAI_API_KEY or GOOGLE_AI_KEY
   - RESEND_API_KEY
   - ADMIN_SECRET_KEY

2. Build & Install Commands (in vercel.json):
   - installCommand: npm install
   - buildCommand: npx prisma generate && next build

3. Ensure Prisma introspection/migrations are applied before first deploy (or use managed database with migrations run):
   - Locally: npx prisma migrate deploy
   - Vercel: Ensure DATABASE_URL points to production DB with schema applied

4. Node version compatibility
   - Use Node >=18

5. Optional: Add a `VERCEL_ENV` secret in Vercel

6. Troubleshooting tips
   - If `npx prisma generate` fails: ensure `DATABASE_URL` is set and reachable during build or configure Prisma to use datasource provider = "postgresql" with an empty URL for generate only.
   - If build fails with TypeScript errors: check `tsconfig.json` strict settings. You can temporarily set `strict: false` or fix type errors.
   - If large dependencies cause memory issues on Vercel builds, consider enabling `NODE_OPTIONS=--max_old_space_size=4096` in environment variables.

7. Post-deploy verification
   - Check Vercel build logs for `prisma generate` and `next build` success
   - Visit the site, log in as test user and test match flow

8. CI: Optionally run `pnpm build` or `npm run build` in CI to catch issues before deployment

