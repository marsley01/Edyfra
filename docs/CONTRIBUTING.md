# Contributing

This is a private repository. Contributions are by invitation only.

## Development Workflow

1. Create a feature branch from `main`
2. Make changes following internal style guidelines
3. Run checks before submitting
4. Submit for review

## Branch Naming

```
feature/short-description
fix/issue-description
docs/what-changed
refactor/what-changed
```

## Commit Messages

Follow conventional commit format:
```
feat: add new feature
fix: resolve issue
docs: update documentation
refactor: improve code structure
```

## Code Style

- TypeScript strict mode
- No `any` types
- Server-side logic for data access
- Validate all user inputs
- Keep components focused and reusable

## PR Checklist

- Code follows style guide
- Tests pass
- Lint passes
- TypeScript compiles
- No hardcoded secrets
- Changes are backward-compatible

## Code Review

All changes require review for:
- Correctness
- Type safety
- Error handling
- Security implications
- Accessibility
