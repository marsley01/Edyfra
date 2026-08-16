# Folder Structure

```
edyfra/
├── src/               # Application source code
│   ├── app/           # Routes and pages
│   ├── components/    # UI components
│   ├── actions/       # Server-side mutations
│   ├── api/           # API endpoints
│   ├── lib/           # Shared libraries
│   ├── store/         # State management
│   └── utils/         # Utilities
├── prisma/            # Database schema
├── public/            # Static assets
├── scripts/           # Utility scripts
├── supabase/          # Backend configuration
├── docs/              # Internal documentation
├── services/          # Background services
└── config files       # Framework and tooling configuration
```

## Key Principles

- Feature-based organization
- Shared code in dedicated directories
- Components organized by domain
- Server-side logic co-located with features
- API endpoints co-located with features
