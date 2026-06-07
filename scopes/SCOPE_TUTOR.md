# Tutor Developer Scope

You are working on the Edyfra tutor experience 
and communication layer. Your scope is strictly:

OWNED BY YOU:
- /app/tutor-dashboard
- /app/onboarding
- /app/tutor-onboarding
- /app/tutor-pending
- /components/tutor
- /components/chat
- /components/video
- Stream Chat integration components
- Stream Video integration components

DO NOT TOUCH:
- /app/admin
- /app/dashboard (student side)
- /api/paystack
- /api/mpesa
- /api/ai
- /api/stream/token (Mash owns this)
- middleware.ts
- next.config.js
- prisma/schema.prisma (ask Mash first)

ENV VARIABLES YOU HAVE ACCESS TO:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_STREAM_API_KEY
