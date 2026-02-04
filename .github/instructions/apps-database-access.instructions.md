---
applyTo: 'apps/**'
---

# Database Access Rules for Apps

**CRITICAL**: Apps MUST NOT import from `@hominem/db` directly.

## Architecture Principle

Only the `hono-rpc` API layer may have direct database access. All applications (`rocco`, `finance`, `notes`, `cli`) must interact with data exclusively through the RPC client.

## Correct Pattern

```typescript
// ✅ Good - Using RPC client for data access
import { useHonoQuery } from '@hominem/hono-client/react';
import type { TaskStatus } from '@hominem/hono-rpc/types';

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get();
    return res.json();
  });
}
```

## Incorrect Pattern

```typescript
// ❌ Bad - Direct DB access in apps
import { db } from '@hominem/db';
import type { TaskStatus } from '@hominem/db/schema/tasks';

export async function getTasks() {
  return db.query.tasks.findMany(); // NEVER do this in apps
}
```

## Types

Import API types from `@hominem/hono-rpc/types`. These are API contracts, NOT database structure:

```typescript
// ✅ Good - API input/output types
import type { TaskStatus } from '@hominem/hono-rpc/types';
import type { GoalMilestone } from '@hominem/hono-rpc/types';

// ❌ Bad - Database structure types
import type { TaskStatus } from '@hominem/db/schema/tasks';
import type { Task } from '@hominem/db/types';
```

## Why This Matters

1. **Maintainability**: Database schema changes only affect one layer (hono-rpc)
2. **Security**: Apps cannot accidentally query or modify data directly
3. **Consistency**: Single data access pattern across all applications
4. **Testability**: Clear mocking points at RPC boundaries

## Allowed Imports

**ALLOWED:**
- `@hominem/hono-client` - For RPC queries/mutations
- `@hominem/hono-rpc` - For types and client configuration
- `@hominem/hono-rpc/types` - For API input/output types only (never DB structure)

**FORBIDDEN:**
- `import { db } from '@hominem/db'` - Direct DB access
- `import * from '@hominem/db/schema/*'` - Database schema types
- `import * from '@hominem/db/types/*'` - Database structure types
- Any import of database-internal types or structure

## Validation

Run `bun run validate-db-imports` to check for violations.
This runs automatically during `bun run check`.

## More Information

See the detailed plan at `docs/plans/2026-type-and-rpc-performance-project.md` (Phase 4: Enforce DB/RPC Separation)
