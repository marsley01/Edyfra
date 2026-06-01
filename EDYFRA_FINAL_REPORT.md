# 🎓 Edyfra Platform: Final Technical Report

**Edyfra** is a high-performance, institutional study platform designed to connect Kenyan scholars with verified tutors and elite peers. It leverages state-of-the-art AI and real-time communication tools to move students from "stuck" to "ready."

---

## 🛠️ 1. Main Tools & Technology Stack

Edyfra is built using a modern "Serverless First" architecture for maximum scalability and performance.

- **Core Framework**: `Next.js 15/16` with `Turbopack` for lightning-fast builds and `TypeScript` for absolute type safety.
- **Database & Auth**: `Supabase` handles authentication, PostgreSQL database management, and real-time subscriptions.
- **Data Modeling**: `Prisma ORM` provides a robust, type-safe interface for all database operations.
- **Communication Layer**:
  - `Stream SDK` powers the high-definition video classrooms and low-latency chat messaging.
- **Artificial Intelligence**:
  - `OpenRouter` integrates top-tier AI models to power **Mash AI**, your personal study companion.
- **Payments & Monetization**: Integrated with `Paystack` and `M-Pesa` for secure, localized transaction handling.
- **Design & UI**: `Tailwind CSS v4` for premium styling, combined with `Framer Motion` for high-end micro-animations and transitions.

---

## 🚀 2. How Edyfra Works

The platform operates on a "Request & Sync" workflow:

1. **Onboarding**: Users choose their role (Student or Tutor) and education level.
2. **Match Me**: Students create a study request for a specific subject (e.g., Calculus, Physics).
3. **Tiered Matching Algorithm**:
   - **Tier 1 (Tutor)**: First, it looks for a verified tutor available for that subject.
   - **Tier 2 (Peer)**: If no tutor is found, it looks for a high-performing peer studying the same topic.
   - **Tier 3 (Mash AI)**: If no human is available within 30 seconds, **Mash AI** steps in to facilitate the session.
4. **Live Session**: Once matched, users are redirected to a **Study Room** equipped with live video, real-time chat, and AI assistance.
5. **Gamification**: Every session earned awards **XP (Points)**, which recalibrates the user's tier and standing within the community.

---

## ✨ 3. Key Features

| Feature | Description |
| :--- | :--- |
| **Smart Study Rooms** | Fully integrated video calls and chat rooms that preserve session history. |
| **Mash AI** | An AI tutor that guides you through questions without just giving the answer—helping you learn the *why*. |
| **Tutor Marketplace** | A feed of verified experts available for instant one-on-one sessions. |
| **Resource Library** | A central hub for revision notes, study guides, and institutional past papers. |
| **Admin Command Center** | A "God Mode" dashboard for administrators to monitor revenue, moderate content, and manage users. |
| **Real-time Notifications** | Multi-channel alerts (In-app, Push, and WhatsApp) for match found, points earned, and community updates. |
| **Premium Dashboards** | Distinct, tailored experiences for students to track progress and tutors to manage earnings. |

---

## ✅ Current Status

The platform has been optimized for **mobile responsiveness** (specifically fixed for iPhone Safari viewports) and is currently deployed on **Vercel** with a clean, error-free build. All critical infrastructure (Stream, Supabase, OpenRouter) is fully integrated and ready for production use.
