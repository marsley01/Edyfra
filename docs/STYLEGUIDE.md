# Style Guide

## TypeScript

- **Strict mode** enabled in `tsconfig.json`
- **No `any`** — use `unknown` with type narrowing
- **Explicit return types** on all functions
- **Named exports** — avoid `export default`
- **Imports** organized: builtin → external → internal → parent → sibling

## React / Next.js

- **Server Components** by default (App Router)
- **Client Components** only when needed (interactivity, hooks, browser APIs)
- **Server Actions** for all data mutations
- **Zustand** for global client state only
- **No `useEffect` for data fetching** — use Server Components or Server Actions

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `auth-helpers.ts` |
| Components | PascalCase | `UserProfile.tsx` |
| Functions | camelCase | `getUserData()` |
| Server Actions | camelCase | `export async function login()` |
| Types/Interfaces | PascalCase | `interface UserProfile` |
| Enums | PascalCase | `enum Role` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| CSS classes | kebab-case | `user-avatar-wrapper` |

## Error Handling

- Server Actions: throw `AuthError`, `ValidationError`, `NotFoundError` from `@/lib/auth`
- API Routes: return `createApiError(error, statusCode)` from `@/lib/auth`
- Client: use `showError()` / `explainError()` from `@/lib/toast`

## Logging

- Use `log("info" | "warn" | "error", message, context)` from `@/lib/logger`
- Never use `console.log`
- Use `console.warn` / `console.error` only in development debugging

## CSS

- Tailwind CSS v4 utility classes
- CSS variables in `globals.css` for theming
- `cn()` utility from `@/lib/utils` for conditional classes
- No inline styles unless dynamically computed
