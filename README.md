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

  <p>
    <img src="https://img.shields.io/badge/license-proprietary-red?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/status-private-black?style=flat-square" alt="Status" />
  </p>
</div>

---

## ⚠️ Proprietary Notice

**This repository is private and proprietary.** All code, designs, and documentation are the intellectual property of Edyfra. Unauthorized copying, modification, distribution, or use of this codebase is strictly prohibited. See the [LICENSE](LICENSE) file for full terms.

---

## 📋 Overview

Edyfra is a full-stack educational platform connecting students, tutors, and institutions through:

- AI-powered tutor matching
- Real-time video study rooms
- Institutional analytics and result management
- Secure payment processing
- Community features and gamification

This repository is intended for authorized development only. It is not open for contributions, forks, or public use.

---

## 🚀 Mission

Democratize access to quality education support for every Kenyan student by building the default academic operating system for Kenyan secondary and tertiary education.

---

## 🏗 High-Level Architecture

```
Client → Edge Network → Application Layer → Backend Services → Data Layer
```

- **Frontend:** Modern React framework with server-side rendering
- **Backend:** API routes, server actions, and edge middleware
- **Database:** Managed PostgreSQL with ORM
- **Real-time:** Chat and video infrastructure
- **AI:** External AI providers for tutoring and content generation
- **Payments:** Integrated mobile money and card processing
- **Infrastructure:** Serverless deployment with edge functions
```

For internal architecture details, refer to the private documentation.

---

## 🔐 Security & Access

- All environment configuration is handled through secure secrets management
- Authentication uses OAuth-compatible flows with server-side sessions
- API routes are protected by middleware and server-side guards
- Rate limiting is enforced at the edge
- Database access is restricted through connection pooling and role-based access

**Do not expose API keys, database credentials, or service secrets in public repositories or client-side code.**

---

## 📁 Internal Structure

```
edyfra/
├── src/
│   ├── app/          # Application routes and pages
│   ├── components/   # UI components
│   ├── actions/      # Server-side mutations
│   ├── api/          # REST endpoints
│   └── lib/          # Shared utilities
├── prisma/           # Database schema
├── supabase/         # Backend configuration
└── docs/             # Internal documentation
```

Detailed structure is available only to authorized contributors.

---

## 📄 License

Copyright © 2026 Edyfra. All rights reserved.

This repository is **not open source**. It is made available for review purposes only. No rights are granted to use, copy, modify, or distribute this code without explicit written permission from the copyright holder.

See [LICENSE](LICENSE) for full terms.
