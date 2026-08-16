# Developer Guide

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/edyfra.git
cd edyfra

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in your environment variables

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Start development server
npm run dev
```

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter
npm run format       # Format code
npm run typecheck    # TypeScript type checking
npm run db:studio    # Database browser
```

## Code Conventions

- Follow existing patterns in the codebase
- Use server-side logic for data access
- Validate all user inputs
- Keep components focused and reusable
