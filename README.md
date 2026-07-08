<div align="center">
  <img src="public/logo.png" alt="Edyfra Logo" width="120" height="120" />
  <h1 align="center">Edyfra</h1>
  <p align="center">
    <strong>Kenya's Institutional Study Platform</strong>
    <br />
    AI-powered tutor matching · Live study rooms · Institutional analytics
    <br />
    Built for the modern Kenyan scholar.
  </p>

  <!-- Badges -->
  <p>
    <a href="https://edyfra-v2.vercel.app"><img src="https://img.shields.io/badge/deployment-live-blue?style=flat-square" alt="Deployment" /></a>
    <a href="https://github.com/anomalyco/edyfra/blob/main/LICENSE"><img src="https://img.shields.io/badge/license- proprietary-red?style=flat-square" alt="License" /></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript 5.9" /></a>
    <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase" alt="Supabase" /></a>
    <a href="https://prisma.io"><img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma 6" /></a>
    <a href="https://getstream.io"><img src="https://img.shields.io/badge/Stream-008CFF?style=flat-square&logo=getstream" alt="Stream" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS v4" /></a>
  </p>
</div>

---

## 📋 Table of Contents

- [Problem](#-problem)
- [Mission & Vision](#-mission--vision)
- [Features](#-features)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [API Overview](#-api-overview)
- [Authentication](#-authentication)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [Known Issues](#-known-issues)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🎯 Problem

Kenyan students face critical barriers to academic success:

- **Tutor access** — finding qualified, nearby tutors is fragmented and expensive
- **Study resources** — past papers, notes, and collaborative tools are scattered across platforms
- **Peer learning** — no unified space for students to form study groups
- **Institutional visibility** — schools lack tools to track student performance and coordinate interventions

Edyfra solves these with a unified platform connecting students, tutors, and institutions.

---

## 🚀 Mission & Vision

**Mission:** Democratize access to quality education support for every Kenyan student.

**Vision:** Become the default academic operating system for Kenyan secondary and tertiary education — where every student has a tutor, every study group has a home, and every institution has data.

---

## ✨ Features

### For Students

| Feature | Description |
|---------|-------------|
| **AI Tutor Matching** | Smart algorithm matches students with ideal tutors based on subject, level, location, and learning style |
| **Live Study Rooms** | Real-time video study rooms powered by Stream Video SDK |
| **Study Groups** | Create or join peer study groups for collaborative learning |
| **Resource Library** | Access past papers, notes, and study materials |
| **Gamification** | Earn XP, level up, unlock achievements, compete on leaderboards |
| **Daily Challenges** | AI-generated daily quizzes with adaptive difficulty |
| **AI Assistant (Eddy)** | On-platform AI tutor for instant academic help |
| **Community Feed** | Social feed for sharing achievements and study tips |

### For Tutors

| Feature | Description |
|---------|-------------|
| **Smart Matching** | Get matched with students who need your expertise |
| **Session Management** | Schedule, conduct, and track tutoring sessions |
| **Earnings Dashboard** | Track payments and payout history |
| **Availability Calendar** | Set your teaching schedule |
| **Resource Monetization** | Sell study materials to students |

### For Institutions

| Feature | Description |
|---------|-------------|
| **Student Analytics** | Track performance, attendance, and engagement |
| **Result Management** | Upload, analyze, and visualize academic results |
| **Teacher Coordination** | Manage teacher assignments and coaching programs |
| **Holiday Coaching** | Organize and manage holiday academic programs |
| **Custom Reports** | Generate institution-wide performance reports |

### For Administrators

| Feature | Description |
|---------|-------------|
| **Platform Analytics** | Real-time platform metrics and insights |
| **User Management** | Manage students, tutors, and institutions |
| **Content Moderation** | AI-assisted content review system |
| **Revenue Dashboard** | Track platform revenue and transactions |
| **AI Settings** | Configure AI behavior and model selection |

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Vercel (Edge Network)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js 16 (App Router)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │  Pages   │  │  API     │  │ Server Actions │   │  │
│  │  │  (RSC)   │  │  (REST)  │  │  (Mutations)   │   │  │
│  │  └──────────┘  └──────────┘  └────────────────┘   │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │       Edge Middleware                       │   │  │
│  │  │  · Auth · Rate Limit · CORS · CSP · CSRF   │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────────────┐   │
│  │  Supabase        │   │  Stream (Chat / Video)   │   │
│  │  · Auth (PKCE)   │   │  · Real-time Messaging   │   │
│  │  · PostgreSQL    │   │  · Video Study Rooms     │   │
│  │  · Row-Level Sec.│   │  · Webhook Integrations  │   │
│  │  · Edge Functions│   └──────────────────────────┘   │
│  └──────────────────┘                                  │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────────────┐   │
│  │  Upstash Redis   │   │  Python Microservices    │   │
│  │  · Rate Limiting │   │  · Moderation            │   │
│  └──────────────────┘   │  · Plagiarism            │   │
│                          │  · Recommendations      │   │
│  ┌──────────────────┐   └──────────────────────────┘   │
│  │  External APIs   │                                   │
│  │  · OpenRouter AI │                                   │
│  │  · M-Pesa        │                                   │
│  │  · Resend Email  │                                   │
│  └──────────────────┘                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.9 (strict) |
| **Styling** | Tailwind CSS v4 + `tw-animate-css` |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Animation** | Framer Motion 12 + Lottie |
| **Database** | PostgreSQL 15 (Supabase) |
| **ORM** | Prisma 6 |
| **Auth** | Supabase Auth (PKCE, SSR) |
| **Real-time Chat** | Stream Chat SDK |
| **Video Calls** | Stream Video SDK |
| **AI** | OpenRouter / Google Gemini / OpenAI |
| **Payments** | M-Pesa (STK Push, B2C) |
| **Email** | Resend |
| **Rate Limiting** | Upstash Redis |
| **Analytics** | Vercel Analytics + Speed Insights |
| **State** | Zustand |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Edge Functions** | Supabase (Deno) |
| **ML Services** | Python (FastAPI-style) |
| **Deployment** | Vercel (London region) |

---

## ⚡ Quick Start

```bash
# Clone
git clone https://github.com/anomalyco/edyfra.git
cd edyfra

# Install
npm install

# Env
cp .env.example .env.local
# Fill in your variables (see table below)

# Generate Prisma client
npx prisma generate

# Push schema
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DIRECT_URL` | ✅ | Direct DB connection (for migrations) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin-level Supabase access |
| `NEXT_PUBLIC_STREAM_KEY` | ✅ | Stream API key |
| `STREAM_SECRET` | ✅ | Stream API secret |
| `OPENROUTER_API_KEY` | ✅ | AI generation API key |
| `RESEND_API_KEY` | ✅ | Email service key |
| `UPSTASH_REDIS_REST_URL` | ✅ | Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Redis token |
| `GOOGLE_AI_KEY` | ❌ | Google Gemini API |
| `MPESA_*` | ❌ | M-Pesa payment credentials |
| `VAPID_*` | ❌ | Push notification keys |
| `CRON_SECRET` | ❌ | Webhook auth secret |

See `.env.example` for the complete list.

---

## 💾 Database Setup

Edyfra uses **Prisma ORM** with **Supabase PostgreSQL**.

```bash
# View schema in Prisma Studio
npm run db:studio

# Push schema changes (dev)
npx prisma db push

# Create a migration
npx prisma migrate dev --name your_migration_name

# Run Supabase SQL migrations
node scripts/run-migration.mjs supabase/migrations/<file>.sql

# Seed data
npx prisma db seed
```

---

## 🖥 Running Locally

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript check
npm test              # Run tests
```

---

## 🚢 Deployment

Edyfra is optimized for **Vercel** deployment.

```bash
# Deploy to Vercel
vercel --prod
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full deployment guide.

---

## 📁 Project Structure

```
edyfra/
├── .github/               # GitHub CI/CD and templates
├── docs/                  # Documentation
├── prisma/                # Database schema & seeds
├── public/                # Static assets
├── scripts/               # Utility scripts
├── services/              # Python microservices
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── actions/       # Server Actions
│   │   ├── api/           # REST API routes
│   │   ├── dashboard/     # Student dashboard
│   │   ├── tutor/         # Tutor dashboard
│   │   ├── admin/         # Admin dashboard
│   │   └── ...            # Public pages
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Shared libraries
│   ├── store/             # Zustand stores
│   ├── utils/             # Utility functions
│   └── middleware.ts      # Edge middleware
├── supabase/              # Supabase config
├── .env.example
├── next.config.js
├── package.json
├── tsconfig.json
└── vercel.json
```

See [`docs/FOLDERSTRUCTURE.md`](docs/FOLDERSTRUCTURE.md) for the detailed structure.

---

## 🌐 API Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Platform statistics |
| `/api/contact` | POST | Contact form |
| `/api/newsletter` | POST | Newsletter subscription |
| `/api/stream/token` | GET | Stream chat token |
| `/api/stream/video-token` | GET | Stream video token |
| `/api/mpesa/stk-push` | POST | M-Pesa payment |
| `/api/mpesa/callback` | POST | M-Pesa callback |
| `/api/push/subscribe` | POST | Push notification sub |
| `/api/webhooks/stream` | POST | Stream webhook |

Full reference in [`docs/API.md`](docs/API.md).

---

## 🔒 Authentication

Edyfra uses **Supabase Auth** with **PKCE flow** and server-side sessions.

- **Sign up** — email + password, confirmation email
- **Sign in** — email + password, role-based redirect
- **Session** — managed via httpOnly cookies with auto-refresh
- **Middleware** — session refresh on every request
- **Server Actions** — protected via `requireAuth()` helper

See [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).

---

## 🤝 Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for details.

**Before contributing:**
- Read the scope files in `scopes/`
- Follow the code style in [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md)
- Run `npm run lint && npm run typecheck` before committing

---

## 🗺 Roadmap

### Current (v0.1)
- [x] Student dashboard
- [x] Tutor dashboard
- [x] Admin dashboard
- [x] Authentication system
- [x] Tutor-student matching
- [x] Real-time chat
- [x] Video study rooms
- [x] AI tutor (Eddy)
- [x] Gamification (XP, tiers, achievements)
- [x] Daily challenges (AI-generated)
- [x] M-Pesa payments
- [x] Institutional portal

### Next (v0.2)
- [ ] Unit and integration test suite
- [ ] E2E tests with Playwright
- [ ] WebAuthn / passkey authentication
- [ ] Offline support (PWA)
- [ ] Mobile app (React Native)
- [ ] Multi-language support (Swahili)
- [ ] Advanced analytics dashboard

### Future
- [ ] AI-generated personalized study plans
- [ ] Peer review system
- [ ] Virtual classroom (whiteboard, screen share)
- [ ] Integration with KCSE/KCSE past papers database
- [ ] Scholarship marketplace
- [ ] Parent/guardian portal

---

## ❓ FAQ

**Q: Who is Edyfra for?**
A: Kenyan high school and university students, tutors, and educational institutions.

**Q: Is Edyfra free?**
A: Basic features are free. Premium features (unlimited tutoring, resources) are available via subscription or pay-per-session.

**Q: How does tutor matching work?**
A: Our algorithm considers subject, education level, location, availability, and past review scores.

**Q: What is Eddy?**
A: Eddy is the built-in AI tutor powered by OpenRouter/Gemini. Ask academic questions anytime.

**Q: How do payments work?**
A: We use M-Pesa STK Push for payments. Tutors receive payouts via M-Pesa B2C.

---

## ⚠️ Known Issues

- **In-memory rate limiting** in `auth.ts` does not persist across serverless instances — use the Upstash middleware instead
- **Some components** pass `any` types — being migrated to strict typing
- **60+ console.log** statements identified for migration to structured logger
- **Large action files** (`admin.ts`, `match-algorithm.ts`) need to be split into focused modules
- **Missing test suite** — test infrastructure is being set up

---

## 📄 License

Copyright © 2026 Edyfra. All rights reserved.

This repository is public for code review and portfolio evaluation. See [`LICENSE`](LICENSE) for terms.

---

## 👥 Authors

- **Mash Marsley** — _Founder & Lead Developer_ — [@mashmarsley](https://github.com/mashmarsley)

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org) — React framework
- [Supabase](https://supabase.com) — Backend infrastructure
- [Stream](https://getstream.io) — Chat and video SDKs
- [shadcn/ui](https://ui.shadcn.com) — UI component library
- [Vercel](https://vercel.com) — Deployment platform
- [Upstash](https://upstash.com) — Serverless Redis
- [Resend](https://resend.com) — Email delivery
- [OpenRouter](https://openrouter.ai) — AI model access
- [Safaricom](https://safaricom.co.ke) — M-Pesa API
- All contributors and early testers

---

<div align="center">
  <sub>Built with ❤️ for Kenyan education</sub>
</div>
