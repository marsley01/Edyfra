# Changelog

All notable changes to Edyfra are documented here.

## [0.1.0] — 2026-07-08

### Added
- Complete TypeScript strict mode configuration
- ESLint with custom rules (no-console, no-explicit-any, import ordering)
- Prettier code formatting configuration
- Reusable auth helpers: `requireAuth()`, `requireUser()`, `requireRole()`
- Standardized error handling: `AuthError`, `ValidationError`, `NotFoundError`
- Structured logging module with `logInfo()`, `logWarn()`, `logError()`
- Zod input validation for all auth endpoints (login, signup)
- Comprehensive documentation suite (12 docs files)
- GitHub Actions CI workflow (lint, typecheck, build, test)
- GitHub issue and PR templates
- Security policy and contributing guides
- CODEOWNERS file
- `@types/react` duplicate removed from devDependencies
- `shadcn` CLI tool moved to devDependencies
- `dompurify` + `isomorphic-dompurify` consolidated (server-side only)

### Fixed
- Stream API check endpoint no longer exposes `secretLength`
- Upstash Redis initialization now validates env vars at startup
- In-memory Map-based rate limiting migrated to Upstash Redis
- All console.log statements identified for migration to structured logger
- Package.json lint script now actually checks source files
- Duplicate auth boilerplate reduced via `requireAuth()` helper

### Security
- Input validation via Zod on all auth endpoints
- Removed secret length exposure from Stream check API
- Redis client validates env vars before initialization
- CSP headers maintained in next.config.js

### Changed
- `auth.ts` — removed in-memory rate limiting, added Zod validation
- `lib/rate-limit/upstash.ts` — explicit env var validation
- `lib/logger.ts` — added convenience methods and test-mode suppression
- `package.json` — reorganized dependencies, added prettier
- `eslint.config.mjs` — added custom rules
