# Database

## Stack

- **Provider:** Supabase (PostgreSQL 15)
- **ORM:** Prisma 6
- **Client Location:** `src/lib/prisma.ts`

## Schema Overview

The Prisma schema (`prisma/schema.prisma`) defines 40+ models. Key models:

### Core
- **User** — base profile for all roles (student, tutor, admin, founder)
- **StudentProfile** — student-specific fields (education level, interests)
- **TutorProfile** — tutor-specific fields (subjects, rates, verification)

### Communication
- **Message** — chat messages
- **Session** — tutoring/call sessions
- **Review** — session reviews and ratings

### Gamification
- **DailyChallenge** — daily quiz questions
- **Achievement** — earned achievements
- **AnalyticsEvent** — user activity tracking

### Marketplace
- **Resource** — study materials (notes, past papers)
- **Payment** — payment transactions
- **Booking** — scheduled tutoring sessions

### Community
- **FeedPost** — social feed posts
- **CommunityTopic** / **CommunityPost** — forum content
- **Group** / **GroupMember** — study groups

### Institution
- **Institution** — school/organization profiles
- **InstitutionMember** — member roles and status
- **InstitutionStudent** — student enrollment tracking
- **InstitutionResult** — academic results
- **InstitutionCoaching** — holiday coaching programs

## Row-Level Security (RLS)

Supabase RLS policies are defined in `supabase/rls_policies.sql` and individual migration files. Key principles:

- Users can only read/write their own data
- Admins have platform-wide access
- Institution data is scoped to institution membership
- Resource access respects visibility settings

## Migrations

Database migrations are managed through:
1. **Prisma** — for schema changes (`prisma/schema.prisma`)
2. **Supabase SQL** — for RLS policies, triggers, and functions (`supabase/migrations/`)

To run Supabase migrations:
```bash
node scripts/run-migration.mjs supabase/migrations/<filename>.sql
```

## Seed Data

```bash
npx prisma db seed
# runs prisma/seed.ts
```

## Key Query Patterns

### User lookup by ID or email
```typescript
let user = await prisma.user.findUnique({ where: { id } });
if (!user && email) {
  user = await prisma.user.findFirst({ where: { email } });
}
```

### Atomic transactions
```typescript
await prisma.$transaction([
  prisma.matchRequest.update(...),
  prisma.user.update(...),
]);
```

### With relation loading
```typescript
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    studentProfile: true,
    tutorProfile: true,
  },
});
```
