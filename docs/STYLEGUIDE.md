# Style Guide

## TypeScript

- Strict mode enabled
- No `any` types — use `unknown` with type narrowing
- Explicit return types on all functions
- Named exports preferred
- Organized imports

## React / Next.js

- Server Components by default
- Client Components only when needed
- Server Actions for data mutations
- No `useEffect` for data fetching

## Naming Conventions

| Item | Convention |
|------|-----------|
| Files | kebab-case |
| Components | PascalCase |
| Functions | camelCase |
| Types/Interfaces | PascalCase |
| Enums | PascalCase |
| Constants | UPPER_SNAKE |

## Error Handling

- Server Actions: throw typed errors
- API Routes: return typed error responses
- Client: use centralized error display

## Logging

- Use structured logger
- Never use console.log in production
- Include context for debugging

## CSS

- Tailwind CSS utility classes
- CSS variables for theming
- Utility function for conditional classes
- No inline styles unless dynamically computed
