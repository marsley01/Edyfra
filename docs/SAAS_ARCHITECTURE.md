# SaaS Architecture Guide

## Architecture Overview

Edyfra follows a **layered feature-based architecture** with clear domain separation. The architecture supports 100,000+ students, thousands of tutors, hundreds of institutions, and future mobile apps.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Next.js App │  │ Shared Hooks │  │  Design    │  │  Mobile   │  │
│  │   Router    │  │              │  │  System    │  │  (Future) │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                        API LAYER                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Server Actions (Mutations)  ·  REST API Routes (External)  │    │
│  │  Edge Middleware (Auth, Rate Limit, CORS, CSP, CSRF)        │    │
│  └────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Auth    │ │  Student │ │  Tutor   │ │Institution│ │  Admin   │ │
│  │  Feature │ │  Feature │ │  Feature │ │  Feature  │ │  Feature │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Library  │ │  Study   │ │Messaging │ │  Video   │ │    AI    │ │
│  │  Feature │ │  Feature │ │  Feature │ │  Feature │ │  Feature │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Auth    │ │  User    │ │  Session │ │  Payment │ │Resource  │ │
│  │ Service  │ │ Service  │ │  Service │ │  Service │ │ Service  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  AI      │ │  Match   │ │  Notif.  │ │ Storage  │ │  Email   │ │
│  │ Service  │ │  Service │ │  Service │ │ Service  │ │ Service  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                     REPOSITORY LAYER                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  User    │ │  Session │ │  Payment │ │ Resource │ │  ...     │ │
│  │  Repo    │ │  Repo    │ │  Repo    │ │  Repo    │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Prisma ORM│ │  Redis   │ │ Stream   │ │ Supabase │ │  Python  │ │
│  │PostgreSQL│ │  (Cache) │ │ (Chat/   │ │ (Auth/   │ │ Micro-   │ │
│  │          │ │          │ │  Video)  │ │ Storage) │ │ services │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Client Layer (`src/shared/`)
- **Design System** — Atomic design (atoms → molecules → organisms → templates)
- **Shared Hooks** — Reusable React hooks (pagination, infinite scroll, debounce, etc.)
- **Feature components** — Co-located in `src/features/<domain>/components/`

### 2. API Layer (`src/core/api/`, `src/core/auth/`)
- **Server Actions** — Type-safe mutations with Zod validation
- **REST Routes** — JSON endpoints with standardized responses
- **Edge Middleware** — Auth session, rate limiting, CORS, CSP, CSRF
- **Typed API Client** — `APIClient` abstraction for all client-server communication

### 3. Application Layer (`src/features/`)
- **Feature modules** — Each domain is a self-contained module
- **Domain separation** — Auth, Student, Tutor, Institution, Admin, Library, Study, Messaging, Video, AI, Payments
- **Feature stubs** — Feature definitions with minRole and description

### 4. Service Layer (`src/core/`)
- **Business logic** — All domain logic lives in services
- **Cross-cutting concerns** — Auth, notifications, payments, storage, analytics
- **Event-driven** — `EventBus` for decoupled communication between services

### 5. Repository Layer (`src/core/database/`)
- **BaseRepository<T>** — Generic CRUD operations with pagination
- **Prisma integration** — Extends Prisma client with standardized patterns
- **Pagination** — Built-in `buildPagination`, `paginateResponse`, `infiniteResponse`

### 6. Infrastructure Layer
- **Database** — PostgreSQL via Prisma ORM
- **Cache** — Upstash Redis (rate limiting, caching)
- **Real-time** — Stream Chat + Video
- **Auth** — Supabase Auth
- **Storage** — Supabase Storage
- **AI** — OpenRouter / Google Gemini

## Folder Structure

```
src/
├── core/                    # Infrastructure layer
│   ├── api/                 # API client, HTTP utilities
│   ├── auth/                # RBAC, permissions, auth middleware
│   ├── cache/               # Caching service
│   ├── config/              # Environment validation
│   ├── database/            # BaseRepository, pagination
│   ├── errors/              # AppError hierarchy
│   ├── events/              # EventBus
│   ├── feature-flags/       # Feature flag system
│   ├── jobs/                # Background job queue
│   ├── logging/             # Structured logging
│   ├── monitoring/          # Performance monitoring
│   ├── notifications/       # Notification service
│   ├── payments/            # Payment abstraction
│   ├── storage/             # File storage abstraction
│   └── analytics/           # Analytics abstraction
├── features/                # Feature modules
│   ├── auth/                # Authentication module
│   ├── student/             # Student module
│   ├── tutor/               # Tutor module
│   ├── institution/         # Institution module
│   ├── admin/               # Admin module
│   ├── library/             # Digital library
│   ├── study/               # Study rooms
│   ├── messaging/           # Chat messages
│   ├── video/               # Video calls
│   ├── ai/                  # AI features
│   ├── payments/            # Payments
│   └── notifications/       # Notifications
├── shared/                  # Shared across features
│   ├── hooks/               # Reusable hooks
│   ├── ui/                  # Design system
│   │   ├── atoms/           # Button, Input, Text, Badge, etc.
│   │   ├── molecules/       # Card, FormField, Modal, Pagination
│   │   ├── organisms/       # Header, Sidebar, DataTable
│   │   └── templates/       # DashboardLayout, AuthLayout
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   └── constants/           # App constants
└── app/                     # Next.js App Router routes
```

## Key Architecture Decisions

### 1. Feature-Based over File-Type Organization
- **Why:** Features change together. Co-locating by domain reduces cognitive load and makes modules independently deployable.
- **Migration path:** Existing code in `src/components/` and `src/app/actions/` can be gradually moved into feature modules.

### 2. Service Layer for Business Logic
- **Why:** Separates business rules from framework concerns (Next.js, Prisma).
- **Pattern:** Services are plain TypeScript classes, testable without framework dependencies.

### 3. Repository Pattern for Data Access
- **Why:** Abstracts Prisma behind a clean interface. Enables testing with in-memory stores.
- **Pattern:** `BaseRepository<T>` provides `findById`, `findManyPaginated`, `create`, `update`, `delete`.

### 4. Event-Driven Communication
- **Why:** Decouples services. Side effects (notifications, analytics, logging) happen via events.
- **Pattern:** Services emit events; other services listen without direct coupling.

### 5. RBAC with Permission Inheritance
- **Why:** Hierarchical roles (Student < Tutor < School Admin < Super Admin < Founder) with permission inheritance.
- **Pattern:** Higher roles automatically inherit permissions from lower roles.

### 6. Design System (Atomic Design)
- **Why:** Consistent UI, faster development, easier theming.
- **Pattern:** Atoms → Molecules → Organisms → Templates.
- **Components:** All new UI uses the design system; existing shadcn/ui components are wrapped.

## Scaling Considerations

### Database (100K+ Users)
- Prisma connection pooling via Supabase
- Database indexes on frequently queried columns
- Pagination on all list endpoints
- Cursor-based pagination for real-time feeds

### Caching Strategy
- **Redis:** Rate limiting, session data, frequently accessed config
- **In-memory:** Feature flags, reference data
- **React cache():** Server-side data caching
- **CDN:** Static assets via Vercel Edge

### Background Jobs
- **In-process queue:** Email sending, notification dispatch, analytics aggregation
- **Supabase Edge Functions:** Daily reset cron jobs
- **Future:** Bull/SQS integration for heavy workloads

### API Performance
- Response compression (enabled in Next.js)
- Bundle optimization via `optimizePackageImports`
- Lazy loading for heavy SDKs (Stream, Recharts)
- Image optimization via `next/image`

## Migration Guide

Existing code can be migrated incrementally:

1. **Phase 1:** Use `src/core/` services in new code
2. **Phase 2:** Move large action files into feature modules
3. **Phase 3:** Replace direct Prisma calls with repositories
4. **Phase 4:** Migrate components to design system
5. **Phase 5:** Add tests for all new code

## Testing Strategy

| Layer | Test Type | Tools |
|-------|-----------|-------|
| Infrastructure | Unit tests | Vitest |
| Repositories | Integration tests | Vitest + Test DB |
| Services | Unit + Integration | Vitest |
| API Routes | Integration | Vitest + MSW |
| UI Components | Component tests | Vitest + Testing Library |
| E2E | End-to-end | Playwright |

## Test Coverage Targets

- Core infrastructure: 90%+
- Shared utilities: 90%+
- Services: 80%+
- Repositories: 70%+
- UI Components: 70%+
- API Routes: 80%+
- Overall target: 75%+
