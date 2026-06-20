# Student Developer Scope

You are working on the Edyfra student-side 
experience. Your scope is strictly:

OWNED BY YOU:
- /app/dashboard (excluding /app/dashboard/admin)
- /app/match-me
- /app/dashboard/resources
- /app/dashboard/settings (student settings only)
- /components/student
- /components/challenges
- /api/challenges (read only, do not modify 
  the AI generation logic)

DO NOT TOUCH:
- /app/admin
- /app/tutor-dashboard
- /api/paystack
- /api/mpesa
- /api/stream/token
- /api/ai
- /lib/supabase (read only)
- middleware.ts
- next.config.js
- Any file in /scopes that is not yours
- prisma/schema.prisma (ask Mash first)

ENV VARIABLES YOU HAVE ACCESS TO:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_STREAM_API_KEY
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

ENV VARIABLES YOU DO NOT HAVE:
- PAYSTACK_SECRET_KEY (server only, Mash owns)
- STREAM_SECRET_KEY (server only, Mash owns)
- OPENROUTER_API_KEY (server only, Mash owns)
- ADMIN_EMAIL_1 and ADMIN_EMAIL_2 (Mash only)
