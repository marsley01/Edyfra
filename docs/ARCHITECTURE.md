# Architecture

## Overview

Edyfra is built on a **monorepo-style** Next.js 16 application with Python microservices. The architecture follows a **feature-based** organization within the Next.js App Router paradigm.

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Edge)                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js 16 App Router                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │
│  │  │  Pages   │ │  API     │ │  Server Actions  │   │  │
│  │  │ (RSC)    │ │ (REST)   │ │  (Mutations)     │   │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘   │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │         Middleware (Edge)                   │   │  │
│  │  │  · Auth Session Refresh                     │   │  │
│  │  │  · Rate Limiting (Upstash Redis)            │   │  │
│  │  │  · CORS / CSRF / Security Headers           │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐     ┌────────────────────────┐  │
│  │  Supabase          │     │  Stream (Chat/Video)   │  │
│  │  · Auth            │     │  · Real-time Chat      │  │
│  │  · PostgreSQL      │     │  · Video Calls         │  │
│  │  · Storage         │     │  · Webhooks            │  │
│  │  · Edge Functions  │     └────────────────────────┘  │
│  └────────────────────┘                                  │
│                                                          │
│  ┌────────────────────┐     ┌────────────────────────┐  │
│  │  Upstash Redis     │     │  Python Microservices  │  │
│  │  · Rate Limiting   │     │  · Moderation          │  │
│  └────────────────────┘     │  · Plagiarism Check    │  │
│                             │  · Recommendations     │  │
│  ┌────────────────────┐     └────────────────────────┘  │
│  │  External APIs     │                                  │
│  │  · OpenRouter/Gemini│                                  │
│  │  · M-Pesa          │                                  │
│  │  · Resend (Email)  │                                  │
│  └────────────────────┘                                  │
└─────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Next.js App Router with Server Actions
- **Pages** are React Server Components (RSC) by default
- **Server Actions** handle all data mutations (login, signup, profile updates)
- **API Routes** serve REST endpoints for external integrations (M-Pesa, Stream webhooks)

### 2. Supabase Auth + Prisma ORM
- **Supabase Auth** handles authentication, session management, OAuth
- **Prisma** provides type-safe database access with PostgreSQL
- Row-Level Security (RLS) in Supabase provides additional access control

### 3. Stream SDK for Real-Time Features
- **Stream Chat** powers messaging, study groups, and community features
- **Stream Video** enables live study rooms and tutoring sessions

### 4. Three User Roles
- **Student** — dashboard, study rooms, tutor matching, resources
- **Tutor** — sessions, earnings, schedule management
- **Admin** — platform management, moderation, analytics

### 5. Python Microservices
- Separate services for content moderation, plagiarism detection, and recommendations
- Communicated via HTTP from Next.js API routes

## Data Flow

```
Client (Browser)
    │
    ├── RSC (server component) ──► Prisma ──► PostgreSQL
    │                              │
    ├── Server Action ─────────────┤
    │                              │
    ├── API Route ────────────────► External Services
    │                              │
    └── Stream SDK (direct) ──────► Stream API
```
