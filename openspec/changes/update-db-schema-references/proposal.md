## Why

The database schema has been redesigned from scratch and is now solid and deployed. The old application code references the previous schema and needs to be rebuilt to work with the new database. This is a ground-up rebuild, not a migration; no backward compatibility required.

## What Changes

This is a complete rebuild of the application layer working outward from the database:

1. **Database layer (@hominem/db)** - Complete
  - Schema redesigned and deployed via `phased-db-redesign`
  - Single source of truth: `packages/db/src/migrations/schema.ts`

2. **Service layer (@hominem/db services)** - In Progress
  - Rebuild all service files to use new schema
  - Use a fixed blueprint of file names, method signatures, contracts, and tests defined in `design.md`
  - No backward compatibility needed

3. **API layer (services/api, packages/hono-rpc)** - Pending
  - Rebuild routes to use new service signatures
  - Update RPC schemas and response types
  - Validate and normalize all external input at API boundaries

4. **App layer (apps/*)** - Pending
  - Rebuild UI data integration through RPC client only (`@hominem/hono-client`)
  - Remove any legacy direct database/service imports from apps

## Architecture Principles

### Type-Checking Performance (Critical at Scale)

- **No barrel files in service internals** - each import is explicit
- **Local type definitions** - `type Task = typeof tasks.$inferSelect` in each service file
- **No service exports from package root index** - root exports infra only (`db`, `getDb`, helpers)
- **Domain schema slice imports** - services import from `src/schema/<domain>.ts`, not directly from monolithic generated schema
- **Physical schema segmentation** - `src/schema/<domain>.ts` files are generated standalone modules, not re-export wrappers around `migrations/schema.ts`
- **No broad `Partial<$inferInsert>` in public service signatures** - use explicit update DTO interfaces
- **Result:** smaller symbol graphs and faster incremental typecheck/tsserver response

### Service Pattern

```typescript
// packages/db/src/services/tasks.service.ts

type Task = typeof tasks.$inferSelect
type TaskInsert = typeof tasks.$inferInsert

type TaskId = string & { __brand: 'TaskId' }
function asTaskId(id: string): TaskId {
  return id as TaskId
}

export interface TaskServiceDeps {
  db: DatabaseClient
}

export function createTaskService(deps: TaskServiceDeps) {
  return {
    async list(userId: UserId): Promise<Task[]> {
      const result = await deps.db.select().from(tasks).where(eq(tasks.userId, userId))
      return result
    },

    async getById(id: TaskId, userId: UserId): Promise<Task | null> {
      const [task] = await deps.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .limit(1)
      return task ?? null
    },

    async create(data: TaskInsert): Promise<Task> {
      const [task] = await deps.db.insert(tasks).values(data).returning()
      return task
    }
  }
}

import { db } from '../client'
export const taskService = createTaskService({ db })
```

### Runtime Validation and Branded IDs

- Branded IDs are compile-time safety only and must not be used as runtime validation
- Validate all request IDs with Zod in API handlers before casting/branding
- Convert validated string IDs to branded IDs only after successful validation

### Export Strategy

```typescript
// packages/db/src/index.ts
// Infra runtime exports only (no service exports)

export { db, getDb } from './client'
export { takeUniqueOrThrow } from './client'
```

```typescript
// service consumption from API layer
import { taskService } from '@hominem/db/services/tasks.service'
```

### App Usage (RPC-only)

```typescript
import { useHonoQuery } from '@hominem/hono-client/react'
import type { Task } from '@hominem/hono-rpc/types'

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get()
    return (await res.json()) as Task[]
  })
}
```

## Service Contract Rules

- `list*` methods return arrays (`[]` when empty)
- `get*` methods return object or `null` when not found
- Expected absence is not an exception
- System and infrastructure failures throw typed errors

## Capabilities

### New Capabilities

- Unified tagging system with polymorphic relations (`taggedItems`)
- Partitioned finance transactions by year
- Improved RLS policies
- Branded ID types for type safety

### Modified Capabilities

- All domain capabilities rebuilt: tasks, tags, calendar, contacts, bookmarks, possessions, finance, etc.

## Impact

**Scope:** Entire monorepo; rebuilding from database outward

**Order:**

1. `@hominem/db` services (new architecture)
2. `services/api` routes
3. `packages/hono-rpc`
4. `apps/*` (UI through RPC)

**Constraints:**

- No backward compatibility required
- Local type definitions in each service file
- Branded ID types for entity IDs
- Factory pattern with singleton instance
- Root index exports infra only, no service fan-in
- Return `null` for expected single-record misses, `[]` for empty lists, throw for system errors
- Service redesign follows the explicit file/method blueprint in `design.md`
- Canonical field-level update DTO definitions are locked in `design.md`
- RED-GREEN development with real failing tests first; no placeholder/skeleton tests
- Error taxonomy and API mapping contract are locked in `design.md`
- Query contract (pagination/sorting/filter DTOs) is locked in `design.md`
- Multi-table write transaction and idempotency policy is locked in `design.md`
- Data normalization and shared ID branding utility contracts are locked in `design.md`

## Acceptance Criteria

### Layer 1: `@hominem/db` services

- Services compile with no legacy schema references
- Service files, exports, and method signatures match `design.md` blueprint
- Domain schema modules are physically segmented and contain no imports from `migrations/schema.ts`
- Unit tests cover core CRUD and not-found behavior per service contract rules
- Service tests follow RED-GREEN and shared test utility conventions from `design.md`
- Error mapping behavior is validated end-to-end (`Validation/NotFound/Conflict/Forbidden/Internal`)
- Query contract behavior is validated (limit bounds, cursor stability, deterministic sorting)
- No root-level service export fan-in from `@hominem/db`
- No `Partial<$inferInsert>` public update signatures in services

### Performance Gates

- `bun run typecheck` baseline recorded before implementation and after implementation using a fixed protocol
- Post-change incremental typecheck must not regress by more than 10% based on median of repeated runs
- `tsc --extendedDiagnostics` output captured for `@hominem/db` before/after
- `@hominem/db` subpath import contract (`@hominem/db/services/*`) is configured in package exports/types resolution and validated in typecheck
- tsserver scenario latency evidence is captured before/after and must not regress by more than 10% median

### Layer 2: `services/api`

- All route inputs validated with Zod
- All routes use new service signatures
- AuthN/AuthZ checks present for sensitive operations
- API tests cover success, validation failure, unauthorized, and not-found paths

### Layer 3: `packages/hono-rpc`

- Client/server RPC types match current API payloads
- No stale/removed endpoint references remain
- Typecheck passes in downstream app packages consuming RPC types

### Layer 4: `apps/*`

- App data access uses `@hominem/hono-client` only
- No imports from `@hominem/db` or DB schema/types in apps
- Key screens render and mutate data through RPC without runtime errors

### Repo Gates

- `bun run validate-db-imports` passes
- `bun run validate-db-imports` includes enforcement for no direct service imports from `migrations/schema.ts`
- `bun run test` passes for touched packages
- `bun run check` passes at repo root
- CI includes consumer package typecheck that imports services via `@hominem/db/services/*`
- CI includes generator drift check for `packages/db/src/schema/*.ts`
