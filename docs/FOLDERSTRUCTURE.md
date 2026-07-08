# Folder Structure

```
edyfra/
├── .github/                  # GitHub configuration
│   ├── ISSUE_TEMPLATE/       # Bug report + feature request templates
│   ├── workflows/            # CI/CD pipelines
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── AUTHENTICATION.md
│   ├── CONTRIBUTING.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── FOLDERSTRUCTURE.md
│   ├── SECURITY.md
│   └── STYLEGUIDE.md
│
├── prisma/                   # Database schema and seeds
│   └── schema.prisma
│
├── public/                   # Static assets
│   ├── animations/           # Lottie JSON animations
│   ├── icons/                # PWA icons
│   ├── sounds/               # Sound effects
│   └── videos/               # Hero videos
│
├── scripts/                  # Utility scripts
│   ├── changelog.ps1
│   ├── cleanup-db.ts
│   ├── run-migration.ts
│   └── generate-*.ts
│
├── services/                 # Python microservices
│   ├── moderation/
│   ├── plagiarism/
│   ├── recommendations/
│   └── shared/
│
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── actions/          # Server Actions
│   │   ├── api/              # REST API routes
│   │   ├── dashboard/        # Student dashboard
│   │   ├── tutor/            # Tutor dashboard
│   │   ├── admin/            # Admin dashboard
│   │   ├── institution/      # Institution portal
│   │   └── ...               # Public pages
│   │
│   ├── components/           # React components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── home/             # Landing page sections
│   │   ├── dashboard/        # Dashboard-specific
│   │   ├── tutor/            # Tutor-specific
│   │   ├── chat/             # AI chat components
│   │   ├── community/        # Community/forum
│   │   ├── video/            # Video calling
│   │   ├── stream/           # Stream SDK integration
│   │   ├── institution/      # Institution portal
│   │   └── ...               # Other components
│   │
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Shared libraries
│   │   ├── validation/       # Zod schemas
│   │   └── rate-limit/       # Upstash rate limiting
│   ├── store/                # Zustand stores
│   ├── utils/                # Utility functions
│   │   └── supabase/         # Supabase client + middleware
│   ├── data/                 # Static data
│   ├── middleware.ts         # Next.js edge middleware
│   └── generated/            # Prisma generated client
│
├── supabase/                 # Supabase configuration
│   ├── migrations/           # SQL migrations
│   └── functions/            # Edge Functions
│
├── .env.example              # Environment variable template
├── .prettierrc               # Prettier configuration
├── eslint.config.mjs         # ESLint configuration
├── next.config.js            # Next.js configuration
├── package.json
├── tsconfig.json
└── vercel.json
```

## Key Principles

- **Feature-based** organization within `src/app/`
- **Shared code** goes in `src/lib/`, `src/utils/`, or `src/hooks/`
- **Components** are organized by domain (dashboard, tutor, admin, etc.)
- **Server Actions** are co-located in `src/app/actions/`
- **API Routes** are co-located in `src/app/api/`
