# Migration Guide

## Moving from Legacy to Enterprise Architecture

This guide explains how to migrate existing code to the new enterprise architecture while maintaining backward compatibility.

## Overview

The existing code in `src/app/actions/`, `src/components/`, and `src/lib/` continues to work. The new architecture in `src/core/`, `src/shared/`, and `src/features/` is additive — you can use it alongside existing code.

## Migration Phases

### Phase 1: Use Core Services (Immediate)

Replace direct Prisma/API calls with core services:

```typescript
// Before
import prisma from "@/lib/prisma";
const user = await prisma.user.findUnique({ where: { id } });

// After
import { UserRepository } from "@/features/student/repositories";
const user = await new UserRepository().findById(id);
```

Replace duplicated auth boilerplate:

```typescript
// Before
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error("Unauthorized");

// After
import { requireAuth } from "@/lib/auth";
const { user } = await requireAuth();
```

### Phase 2: Split Large Action Files

Large files (admin.ts, match-algorithm.ts, user.ts) should be split into feature modules:

```
src/features/admin/
├── services/
│   ├── user-management.ts
│   ├── session-management.ts
│   ├── resource-management.ts
│   └── moderation.ts
├── repositories/
│   ├── user-repository.ts
│   └── session-repository.ts
├── types/
│   └── index.ts
└── index.ts
```

### Phase 3: Add Repositories

Create repositories for each domain model:

```typescript
// src/features/student/repositories/student-repository.ts
import { BaseRepository } from "@/core/database";
import prisma from "@/lib/prisma";

export class StudentRepository extends BaseRepository<Student> {
  protected delegate = prisma.user;
  constructor() {
    super("Student");
  }

  async findByEmail(email: string) {
    return this.findFirst({ email });
  }

  async findByInstitution(institutionId: string) {
    return this.findMany({ where: { institutionId } });
  }
}
```

### Phase 4: Migrate Components

Replace raw HTML with design system components:

```jsx
// Before
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Click me
</button>

// After
import { Button } from "@/shared/ui/atoms/Button";
<Button variant="primary" size="md">Click me</Button>
```

### Phase 5: Use Shared Hooks

Replace ad-hoc state management with shared hooks:

```typescript
// Before
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const totalPages = Math.ceil(total / 20);

// After
import { usePagination } from "@/shared/hooks";
const { page, totalPages, nextPage, prevPage, goToPage, setTotal } = usePagination();
```

## Pattern Comparison

| Pattern | Legacy | Enterprise |
|---------|--------|------------|
| Auth check | 4-line block in every action | `requireAuth()` |
| Error handling | Inconsistent | `AppError` hierarchy |
| API client | Direct fetch | `APIClient` |
| DB queries | Direct Prisma | Repository pattern |
| Pagination | Manual | `buildPagination`/`paginateResponse` |
| Logging | console.log | `logger.info/warn/error` |
| State | useState | Shared hooks |
| UI | Tailwind classes | Design system components |
| Events | Coupled | EventBus |
| Config | process.env | `env.get()` |
| Feature flags | N/A | `featureFlags.isEnabled()` |
| Jobs | N/A | `jobQueue.enqueue()` |
| Cache | N/A | `cache.getOrSet()` |

## Rollback Plan

Each migration is backward-compatible:
- Old imports still work (no files deleted)
- Old patterns still valid
- Wrapper functions provide fallbacks
- Feature flags can disable new behavior

## Testing Migration

New tests use Vitest; existing code can gradually adopt testing:

```typescript
// Test a service
import { describe, it, expect } from "vitest";
import { MyService } from "./my-service";

describe("MyService", () => {
  it("does something", async () => {
    const service = new MyService();
    const result = await service.execute();
    expect(result).toBeDefined();
  });
});
```
