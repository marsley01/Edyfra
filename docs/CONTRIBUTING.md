# Contributing

## Development Workflow

1. **Fork** the repository
2. **Create a feature branch** from `main`
3. **Make changes** following the style guide
4. **Run checks**:
   ```bash
   npm run lint
   npm run typecheck
   npm run format:check
   ```
5. **Write tests** for new functionality
6. **Submit a pull request** against `main`

## Branch Naming

```
feature/short-description
fix/issue-description
docs/what-changed
refactor/what-changed
```

## Commit Messages

Follow conventional commits:

```
feat: add tutor scheduling availability
fix: resolve session timeout calculation
docs: add deployment guide
refactor: extract auth helper
test: add login validation tests
```

## Code Style

- TypeScript strict mode
- No `any` types (use `unknown` and type guards)
- No `console.log` (use `src/lib/logger.ts`)
- Named exports preferred over default exports
- Server Actions return `{ error?: string }` or `{ success: true, data?: T }`
- API Routes return typed JSON responses

## PR Checklist

- [ ] Code follows style guide
- [ ] Tests pass
- [ ] Lint passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] No new `console.log` statements
- [ ] No new `any` types
- [ ] Environment variables documented in `.env.example`
- [ ] Changes are backward-compatible

## Code Review

All PRs require at least one review. Reviewers should check for:
- Correctness
- Type safety
- Error handling
- Performance implications
- Security implications
- Accessibility
