# Contributing to Edyfra

Please read the full contributing guide at [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

## Quick Links

- [Style Guide](docs/STYLEGUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## Before You Start

- Read `TEAM.md` to understand your scope
- Read scope files in `scopes/` for your role
- Get `.env.local` from a team member

## Workflow

1. `git checkout -b feat/your-feature-name`
2. Make changes within your scope
3. `npm run lint && npm run typecheck`
4. `git commit -m "feat: description"`
5. `git push origin feat/your-feature-name`
6. Open a PR with a clear description

## Rules

- No pushing to `main`
- No modifying files outside your scope
- No new npm packages without team approval
- No hardcoded API keys
- No modifying `prisma/schema.prisma` without backend review
- Scope your AI tools to your assigned scope
