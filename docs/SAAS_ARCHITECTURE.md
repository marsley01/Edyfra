# Architecture Overview

Edyfra follows a layered architecture with clear separation of concerns.

## Layers

1. **Client Layer** — User interface and shared components
2. **API Layer** — Server actions, REST routes, and edge middleware
3. **Application Layer** — Feature modules organized by domain
4. **Service Layer** — Business logic and cross-cutting concerns
5. **Repository Layer** — Data access patterns
6. **Infrastructure Layer** — Database, cache, real-time, auth, and external services

## Principles

- Domain-driven feature organization
- Server-side data access only
- Type-safe API contracts
- Centralized authentication and authorization
- Event-driven communication between services
