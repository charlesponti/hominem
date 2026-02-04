---
title: Enforce Clear Database/RPC Separation
date: 2026-02-03
status: in-progress
category: architecture
module: api
tags:
  - database
  - rpc
  - architecture
  - separation-of-concerns
  - type-safety
  - lint-rules
priority: high
metrics:
  - "3 apps (rocco, finance, notes) requiring dependency updates"
  - "~15 files with type-only DB imports to migrate"
  - "2 files with runtime DB violations to eliminate"
  - "100% enforcement via lint rules"
outcome: "Clear architectural boundary where only hono-rpc touches the database, all apps use RPC client exclusively"
---

# Enforce Clear Database/RPC Separation

**Project:** Hominem Monorepo  
**Initiative:** Architecture Hardening - Database Access Boundaries  
**Status:** 📝 In Progress  
**Date:** February 3, 2026  

## ✅ CRITICAL CORRECTION (February 3, 2026)

**Discovery:** The original type migration strategy incorrectly proposed re-exporting database types through `hono-rpc/types`. This violates the core separation principle.

**What We Found:** Apps should import **API types** (input/output contracts), NOT database structure types.

**Architecture Clarification:**
```
Apps should know:      Apps must NOT know:
- API contracts       - Database schema
- Request/response    - Database types
  types               - Database structure
```

**What Changed:**
- ✅ Apps correctly use API types from `@hominem/hono-rpc/types`
- ✅ Removed database type re-exports from `hono-rpc/src/types/index.ts`
- ✅ Updated documentation (AGENTS.md, GitHub instructions) to clarify API types vs DB types

**Result:** The architecture is now correct. Apps import **API types only**, maintaining strict separation.  

---

## Executive Summary

Establish a strict architectural boundary ensuring only the `hono-rpc` API layer has direct database access. All applications (`rocco`, `finance`, `notes`, `cli`) must interact with data exclusively through the RPC client. This creates a clear separation of concerns, improves maintainability, and prevents accidental coupling between apps and database implementation details.

**Key Objectives:**
- **Runtime violations eliminated:** 2 critical files currently importing DB client directly
- **Type imports migrated:** ~15 files importing DB types need alternative sources
- **Dependencies cleaned:** Remove `@hominem/db` from all app package.json files
- **Lint enforcement:** 100% prevention of future violations via automated rules
- **Zero breaking changes:** All functionality preserved through RPC layer

**Business Value:**
- **Maintainability:** Database schema changes only affect one layer (hono-rpc)
- **Security:** Apps cannot accidentally query or modify data directly
- **Consistency:** Single data access pattern across all applications
- **Testability:** Clear mocking points at RPC boundaries
- **Scalability:** Database optimizations centralized in API layer

---

## Problem Statement

The current architecture allows applications to import from `@hominem/db` directly, creating tight coupling between frontend apps and database implementation. This violates separation of concerns and creates maintenance risks.

### Current Violations

**Critical (Runtime DB Access):**

| App | File | Violation | Impact |
|-----|------|-----------|--------|
| `rocco` | `scripts/debug-check-photos.ts` | Imports `db` client and queries directly | Debug script bypasses API layer |
| `rocco` | `app/test/context.test.ts` | Imports test fixtures from DB package | Tests coupled to DB implementation |

**Type-Only Imports (Needs Migration):**

| App | File | Import | Usage |
|-----|------|--------|-------|
| `rocco` | `app/lib/types.ts` | `PlaceOutput`, `ItemOutput` from DB types | Type definitions |
| `rocco` | `app/lib/places-utils.ts` | `PlaceInput` from DB types | Form handling |
| `rocco` | `app/components/places/PlaceStatus.tsx` | `PlaceOutput` from DB types | Component props |
| `notes` | `app/components/goals/goal-card.tsx` | `GoalMilestone` from DB types | Goal display |
| `notes` | `app/hooks/use-tasks.ts` | `TaskPriority`, `TaskStatus` from DB schema | Task management |
| `notes` | `app/routes/tasks/components/task-item.tsx` | `TaskPriority`, `TaskStatus` from DB schema | Task UI |
| `notes` | `app/routes/tasks/components/task-create-form.tsx` | `TaskPriority` from DB schema | Form validation |
| `notes` | `app/components/priority-select.tsx` | `TaskPriority` from DB schema | Priority selector |
| `notes` | `app/lib/types/chat.ts` | `ChatMessageToolCall` from DB types | Chat types |

### Why This Matters

1. **Schema Coupling:** When database schema changes, apps break even if API contract remains stable
2. **Testing Complexity:** Apps must mock database instead of RPC layer
3. **Security Risk:** Direct DB access in apps could leak connection strings or allow unauthorized queries
4. **Inconsistent Patterns:** Some apps use RPC (correct), others mix RPC with direct DB types
5. **Bundle Size:** DB package includes schemas, migrations, and client code unused by apps

### Contrast: Current vs Target Architecture

**Current (Mixed Access):**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   rocco     │     │   finance   │     │    notes    │
│   ┌─────┐   │     │   ┌─────┐   │     │   ┌─────┐   │
│   │ DB  │◄──┼─────┼──►│ DB  │◄──┼─────┼──►│ DB  │   │
│   └──┬──┘   │     │   └──┬──┘   │     │   └──┬──┘   │
└──────┼──────┘     └──────┼──────┘     └──────┼──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌───────┴───────┐
                    │  @hominem/db  │
                    └───────┬───────┘
                           │
                    ┌───────┴───────┐
                    │   Database    │
                    └───────────────┘
```

**Target (RPC-Only Access):**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   rocco     │     │   finance   │     │    notes    │
│             │     │             │     │             │
│ ┌─────────┐ │     │ ┌─────────┐ │     │ ┌─────────┐ │
│ │ RPC     │ │     │ │ RPC     │ │     │ │ RPC     │ │
│ │ Client  │─┼─────┼─► Client  │─┼─────┼─► Client  │ │
│ └────┬────┘ │     │ └────┬────┘ │     │ └────┬────┘ │
└──────┼──────┘     └──────┼──────┘     └──────┼──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌───────┴───────┐
                    │  hono-rpc     │
                    │  ┌─────────┐  │
                    │  │   DB    │  │
                    │  └────┬────┘  │
                    └───────┼───────┘
                            │
                     ┌──────┴──────┐
                     │  @hominem/db│
                     └──────┬──────┘
                            │
                     ┌──────┴──────┐
                     │  Database   │
                     └─────────────┘
```

---

## Current State Analysis

### RPC Infrastructure (Already in Place)

**`@hominem/hono-rpc`** (Server-side types and client factory):
- `/packages/hono-rpc/src/client.ts` - Exports `createHonoClient()` and `HonoClientType`
- Uses `hc` from `hono/client` with full type safety from `AppType`

**`@hominem/hono-client`** (React/client-side hooks):
- `/packages/hono-client/src/index.ts` - Re-exports client creator
- `/packages/hono-client/src/react/hooks.ts` - React Query hooks:
  - `useHonoQuery()` - For RPC queries with caching
  - `useHonoMutation()` - For RPC mutations
  - `useHonoUtils()` - For cache management

**Example of Correct RPC Usage (from `apps/notes`):**
```typescript
// /Users/charlesponti/Developer/hominem/apps/notes/app/hooks/use-tasks.ts
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

export function useTasksList() {
  return useHonoQuery<TasksListOutput>(
    ['tasks', 'list'],
    async (client: HonoClient) => {
      const res = await client.api.tasks.$get();
      return res.json();
    },
  );
}
```

### Package Dependencies (Need Cleanup)

All apps have both `@hominem/db` and RPC packages:

```json
// apps/rocco/package.json
{
  "dependencies": {
    "@hominem/db": "workspace:*",        // ❌ Should be removed
    "@hominem/hono-client": "workspace:*", // ✅ Keep
    "@hominem/hono-rpc": "workspace:*",    // ✅ Keep
  }
}
```

Same pattern exists in `apps/finance/package.json` and `apps/notes/package.json`.

---

## Proposed Solution

### Architecture Principle

> **Only `hono-rpc` and service workers may import from `@hominem/db`. All apps must use `@hominem/hono-client` for data access.**

### Three-Pillar Approach

1. **Remove Runtime Violations:** Eliminate direct DB client usage in apps
2. **Migrate Type Imports:** Re-export needed types from RPC layer or define app-level types
3. **Enforce via Linting:** Automated prevention of future violations

### Type Migration Strategy

**Option A: Re-export from hono-rpc (Recommended for shared types)**

Create a types module in `hono-rpc` that re-exports commonly used DB types:

```typescript
// packages/hono-rpc/src/types/index.ts
export type { 
  TaskPriority, 
  TaskStatus 
} from '@hominem/db/schema/tasks';

export type { 
  PlaceOutput, 
  PlaceInput 
} from '@hominem/db/types/places';

// etc.
```

**Option B: App-level type definitions (Recommended for app-specific shapes)**

Apps define their own types based on RPC responses:

```typescript
// apps/notes/app/lib/types/tasks.ts
// Derived from RPC response types, not DB schema
export type TaskViewModel = {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high'; // App-specific enum
  status: 'todo' | 'in_progress' | 'done'; // App-specific enum
};
```

**Option C: Infer from RPC (Most type-safe)**

Use TypeScript inference from RPC client:

```typescript
// Infer types directly from RPC responses
import type { HonoClient } from '@hominem/hono-rpc';

// Type is inferred from actual API response
export type TasksListOutput = Awaited<
  ReturnType<
    ReturnType<HonoClient['api']['tasks']['$get']>['json']
  >
>;
```

---

## Implementation Phases

### Phase 1: Remove Runtime Violations (Priority 1)

**Duration:** 1-2 hours  
**Status:** Not started

Eliminate the two critical files that import the DB client at runtime.

#### 1.1: Migrate `scripts/debug-check-photos.ts`

**File:** `apps/rocco/scripts/debug-check-photos.ts`

**Current State:**
```typescript
import { db } from '@hominem/db';
import { place } from '@hominem/db/types/places';
import { ilike } from 'drizzle-orm';

async function debug() {
  const p = await db.query.place.findFirst({
    where: ilike(place.name, '%La Colombe%'),
  });
  // ...
}
```

**Migration Options:**

**Option A (Recommended):** Move to admin API endpoint in `services/api/`

Create a debug/admin endpoint that serves the same purpose:

```typescript
// services/api/src/routes/admin/debug-photos.ts
import { Hono } from 'hono';
import { db } from '@hominem/db';

export const debugRoutes = new Hono()
  .get('/photos-check', async (c) => {
    // Move the debug logic here
    const places = await db.query.place.findMany({
      where: ilike(place.name, '%La Colombe%'),
    });
    
    return c.json({
      places,
      photoCount: places.reduce((acc, p) => acc + (p.photos?.length || 0), 0),
    });
  });
```

Then update the script to use the API:

```typescript
// apps/rocco/scripts/debug-check-photos.ts (updated)
import { createHonoClient } from '@hominem/hono-rpc';

async function debug() {
  const client = createHonoClient({ /* config */ });
  const result = await client.api.admin['photos-check'].$get();
  const data = await result.json();
  console.log(data);
}
```

**Option B:** Delete if no longer needed

If this is a one-time debug script that's no longer used, simply delete it.

**Acceptance Criteria:**
- [ ] Script no longer imports `db` from `@hominem/db`
- [ ] Functionality preserved via API endpoint or script deleted

#### 1.2: Update Test Fixtures Import

**File:** `apps/rocco/app/test/context.test.ts`

**Current State:**
```typescript
import { createTestUser } from '@hominem/db/test/fixtures';
```

**Migration:**

Option 1: Move fixtures to a shared test utilities package that doesn't depend on DB
Option 2: Have tests use the API to create test data
Option 3: Create test data via RPC client

**Recommended Approach:**

Create test utilities that use the RPC client:

```typescript
// apps/rocco/app/test/utils.ts
import { createHonoClient } from '@hominem/hono-rpc';

export async function createTestUser(email: string) {
  const client = createHonoClient({ /* test config */ });
  
  // Use RPC to create user (via admin endpoint or test-specific route)
  const res = await client.api.admin['create-test-user'].$post({
    json: { email }
  });
  
  return res.json();
}
```

**Acceptance Criteria:**
- [ ] Test file no longer imports from `@hominem/db`
- [ ] Tests continue to pass

**Phase 1 Deliverables:**
- Zero runtime DB imports in `apps/`
- All debug/test functionality preserved
- Tests passing

---

### Phase 2: Migrate Type Imports (Priority 2)

**Duration:** 4-6 hours  
**Status:** Not started

Migrate ~15 files from importing DB types to using RPC-exported or app-level types.

#### 2.1: Analyze Type Usage Patterns

**Categories of type imports:**

1. **Schema Types:** `TaskPriority`, `TaskStatus` from `@hominem/db/schema/*`
2. **Output Types:** `PlaceOutput`, `ItemOutput` from `@hominem/db/types/*`
3. **Input Types:** `PlaceInput` from `@hominem/db/types/*`
4. **Entity Types:** `GoalMilestone`, `ChatMessageToolCall` from `@hominem/db/types/*`

#### 2.2: Create Type Export Layer in hono-rpc

**File:** `packages/hono-rpc/src/types/index.ts`

```typescript
/**
 * Re-exported types for client applications.
 * Apps should import from here instead of @hominem/db
 */

// Task-related types
export type { 
  TaskPriority, 
  TaskStatus 
} from '@hominem/db/schema/tasks';

// Place-related types
export type { 
  PlaceOutput, 
  PlaceInput 
} from '@hominem/db/types/places';

// Item-related types
export type { 
  ItemOutput 
} from '@hominem/db/types/items';

// Goal-related types
export type { 
  GoalMilestone 
} from '@hominem/db/types/goals';

// Chat-related types
export type { 
  ChatMessageToolCall 
} from '@hominem/db/types/chats';

// Add more as needed...
```

**Update exports in hono-rpc package.json:**

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./types": "./src/types/index.ts"
  }
}
```

#### 2.3: Migrate Each App

**Rocco App:**

| File | Current Import | New Import |
|------|---------------|------------|
| `app/lib/types.ts` | `PlaceOutput`, `ItemOutput` from DB | `@hominem/hono-rpc/types` |
| `app/lib/places-utils.ts` | `PlaceInput` from DB | `@hominem/hono-rpc/types` |
| `app/components/places/PlaceStatus.tsx` | `PlaceOutput` from DB | `@hominem/hono-rpc/types` |

**Notes App:**

| File | Current Import | New Import |
|------|---------------|------------|
| `app/components/goals/goal-card.tsx` | `GoalMilestone` from DB | `@hominem/hono-rpc/types` |
| `app/hooks/use-tasks.ts` | `TaskPriority`, `TaskStatus` from DB | `@hominem/hono-rpc/types` |
| `app/routes/tasks/components/task-item.tsx` | `TaskPriority`, `TaskStatus` from DB | `@hominem/hono-rpc/types` |
| `app/routes/tasks/components/task-create-form.tsx` | `TaskPriority` from DB | `@hominem/hono-rpc/types` |
| `app/components/priority-select.tsx` | `TaskPriority` from DB | `@hominem/hono-rpc/types` |
| `app/lib/types/chat.ts` | `ChatMessageToolCall` from DB | `@hominem/hono-rpc/types` |

**Example Migration:**

```typescript
// apps/notes/app/hooks/use-tasks.ts

// BEFORE:
import type { TaskPriority, TaskStatus } from '@hominem/db/schema/tasks';

// AFTER:
import type { TaskPriority, TaskStatus } from '@hominem/hono-rpc/types';
```

**Phase 2 Deliverables:**
- Type export layer created in hono-rpc
- All 15 files migrated to new import paths
- TypeScript compilation passes
- No functional changes

---

### Phase 3: Clean Up Dependencies (Priority 3)

**Duration:** 1-2 hours  
**Status:** Not started

Remove `@hominem/db` from all app package.json files.

#### 3.1: Update Package Dependencies

**Files to modify:**

- `apps/rocco/package.json`
- `apps/finance/package.json`
- `apps/notes/package.json`

**Change:**

```json
{
  "dependencies": {
    // REMOVE this line:
    // "@hominem/db": "workspace:*",
    
    // KEEP these:
    "@hominem/hono-client": "workspace:*",
    "@hominem/hono-rpc": "workspace:*"
  }
}
```

#### 3.2: Regenerate Lockfile

```bash
bun install
```

**Phase 3 Deliverables:**
- `@hominem/db` removed from all app package.json files
- Lockfile updated
- Apps still compile and run

---

### Phase 4: Add Lint Enforcement (Priority 4)

**Duration:** 2-3 hours  
**Status:** Not started

Implement automated prevention of future DB imports in apps.

#### 4.1: Configure ESLint/OXLint Rules

**File:** `.oxlintrc.json` or `.eslintrc.json`

Add restricted imports rule:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "@hominem/db",
        "message": "Apps must use @hominem/hono-client instead of direct DB access. Import types only from @hominem/hono-rpc/types."
      }],
      "patterns": [{
        "group": ["@hominem/db/*"],
        "message": "Direct DB imports are not allowed in apps. Use RPC client instead."
      }]
    }]
  },
  "overrides": [
    {
      "files": [
        "services/api/**/*",
        "services/workers/**/*",
        "packages/hono-rpc/**/*",
        "packages/*/src/services/**/*"
      ],
      "rules": {
        "no-restricted-imports": "off"
      }
    }
  ]
}
```

#### 4.2: Verify Lint Rule Works

Test that the rule catches violations:

```bash
# Should fail:
echo "import { db } from '@hominem/db';" > apps/rocco/test-violation.ts
bun run lint --filter=@hominem/rocco
# Expected: Error about restricted import
rm apps/rocco/test-violation.ts
```

#### 4.3: Add Package-Level Constraints (Optional)

**File:** `turbo.json`

```json
{
  "pipeline": {
    "//#validate-deps": {
      "dependsOn": []
    }
  }
}
```

Or create a custom dependency validation script:

```json
{
  "scripts": {
    "validate-deps": "node scripts/validate-deps.js"
  }
}
```

**Phase 4 Deliverables:**
- Lint rule configured and tested
- Violations are caught at lint time
- CI/CD will block PRs with DB imports in apps

---

### Phase 5: Documentation and Guidelines (Priority 5)

**Duration:** 1-2 hours  
**Status:** Not started

Document the architecture decision and update developer guidelines.

#### 5.1: Update AGENTS.md

Add section on database access rules:

```markdown
## Database Access Rules

**CRITICAL**: Only the `hono-rpc` layer may import from `@hominem/db`.

### For Applications (apps/*)

**ALLOWED:**
- `@hominem/hono-client` - For RPC queries/mutations
- `@hominem/hono-rpc` - For types and client configuration
- `@hominem/hono-rpc/types` - For database-related types

**FORBIDDEN:**
- `import { db } from '@hominem/db'` - Direct DB access
- `import * from '@hominem/db/schema/*'` - Schema types (use hono-rpc/types)
- `import * from '@hominem/db/types/*'` - DB types (use hono-rpc/types)

### For API Layer (services/api, packages/hono-rpc)

Direct DB access is permitted and expected. Services should:
1. Import `db` from `@hominem/db`
2. Throw typed errors (NotFoundError, etc.)
3. Let error middleware handle HTTP responses
```

#### 5.2: Create GitHub Instructions

**File:** `.github/instructions/database.instructions.md`

```markdown
---
applyTo: 'apps/**'
---

# Database Access Rules

**CRITICAL**: Apps MUST NOT import from `@hominem/db` directly.

## Correct Pattern

```typescript
// Good - Using RPC client
import { useHonoQuery } from '@hominem/hono-client/react';

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get();
    return res.json();
  });
}
```

## Incorrect Pattern

```typescript
// Bad - Direct DB access
import { db } from '@hominem/db';

export async function getTasks() {
  return db.query.tasks.findMany();
}
```

## Types

Import types from `@hominem/hono-rpc/types`:

```typescript
// Good
import type { TaskStatus } from '@hominem/hono-rpc/types';

// Bad
import type { TaskStatus } from '@hominem/db/schema/tasks';
```
```

#### 5.3: Update Architecture Documentation

**File:** `docs/engineering-guidelines.md`

Add section explaining the separation of concerns and why it matters.

**Phase 5 Deliverables:**
- AGENTS.md updated with clear rules
- GitHub instructions created
- Architecture documentation updated

---

## Technical Details

### Why This Architecture?

1. **Single Source of Truth:** Database schema changes only require updates in one place (hono-rpc)
2. **Type Safety:** RPC layer provides typed contracts that apps can depend on
3. **Security:** Apps cannot accidentally (or maliciously) access data outside the API contract
4. **Testability:** Clear boundaries make mocking straightforward
5. **Maintainability:** Changes to DB implementation don't cascade to apps

### RPC Client Type Safety

The RPC client uses Hono's `hc` client with full type inference:

```typescript
import { hc } from 'hono/client';
import type { AppType } from './app';

const client = hc<AppType>('/');

// Fully typed - TypeScript knows the response shape
const response = await client.api.tasks.$get();
const data = await response.json(); // Type: TaskListOutput
```

### Error Handling Through RPC

Errors are handled consistently:

```typescript
// Service throws
throw new NotFoundError('Task not found');

// Middleware converts to HTTP
// HTTP 404 with error body

// Client receives standard HTTP error
const response = await client.api.tasks[':id'].$get({ param: { id: '123' } });
if (!response.ok) {
  const error = await response.json();
  // error: { code: 'NOT_FOUND', message: 'Task not found' }
}
```

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Type mismatch between DB and RPC exports | Medium | Medium | Export types directly from DB, add type tests |
| Missing type exports causing app compilation errors | Medium | High | Comprehensive audit before migration, gradual rollout |
| Lint rule too strict (blocks legitimate cases) | Low | Medium | Careful override configuration for services |
| Developer confusion about where to import types | Medium | Medium | Clear documentation, IDE autocomplete |
| Runtime functionality broken during migration | Low | High | Thorough testing at each phase, rollback plan |
| Apps have hidden runtime dependencies on DB | Low | High | Static analysis to find all imports, runtime testing |

**Overall Risk Level: LOW** - The RPC infrastructure is proven, changes are mechanical, and comprehensive testing will catch issues.

---

## Success Metrics

### Completion Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Runtime DB imports in apps | 0 | `grep -r "from '@hominem/db'" apps/ --include="*.ts" --include="*.tsx" \| grep -v "type"` |
| Type-only DB imports in apps | 0 | `grep -r "from '@hominem/db'" apps/ --include="*.ts" --include="*.tsx"` |
| `@hominem/db` in app package.json | 0 | Check all `apps/*/package.json` |
| Lint violations | 0 | `bun run lint --parallel` |
| TypeScript errors | 0 | `bun run typecheck` |
| Tests passing | 100% | `bun run test` |

### Quality Metrics

| Metric | Before | After |
|--------|--------|-------|
| Files with DB imports (apps) | ~17 | 0 |
| Packages depending on DB (apps) | 3 | 0 |
| Architectural boundary clarity | Mixed | Strict |
| Bundle size (apps) | Includes DB code | DB code excluded |

---

## Alternative Approaches Considered

### Option 1: Keep Current State (Do Nothing)

**Pros:**
- No effort required
- Current system works

**Cons:**
- Continued architectural drift
- Maintenance burden increases over time
- No automated enforcement

**Rejected:** The current state creates technical debt that will compound.

### Option 2: Allow Type-Only Imports

**Pros:**
- Easier migration
- Types are compile-time only

**Cons:**
- Still couples apps to DB schema
- Violates strict separation principle
- Lint rules more complex

**Rejected:** Type-only imports still create coupling. Apps should depend on RPC contract, not DB implementation.

### Option 3: Create Separate Types Package

**Pros:**
- Clean separation
- Types can be versioned independently

**Cons:**
- Additional package to maintain
- More import paths to remember
- Overkill for current needs

**Rejected:** Re-exporting from hono-rpc achieves the same goal with less complexity.

---

## Future Considerations

### After This Migration

1. **API Versioning:** Clear RPC boundary makes API versioning straightforward
2. **Mobile/Third-Party Clients:** RPC layer can serve multiple client types
3. **Microservices:** If DB splits into multiple services, only RPC layer changes
4. **Caching Layer:** Can be added in RPC layer without app changes

### Prevention of Regression

1. **Lint Rules:** Automated enforcement prevents accidental imports
2. **Code Review Guidelines:** Checklist includes "no direct DB access in apps"
3. **CI Gates:** Build fails on any DB imports in apps directory
4. **Documentation:** Clear AGENTS.md section on the rule

### Potential Enhancements

1. **Generated Types:** Generate TypeScript types from OpenAPI spec
2. **SDK Generation:** Generate client SDKs for external consumers
3. **GraphQL Option:** Could add GraphQL layer alongside REST in the future
4. **WebSocket Support:** Real-time updates through RPC layer

---

## Implementation Timeline

| Phase | Duration | Status | Key Deliverables |
|-------|----------|--------|------------------|
| Phase 1: Remove Runtime Violations | 1-2 hrs | ✅ Complete | 2 files migrated |
| Phase 2: Migrate Type Imports | 4-6 hrs | ✅ Complete | 15 files migrated, type exports created |
| Phase 3: Clean Up Dependencies | 1-2 hrs | ✅ Complete | 3 package.json updated |
| Phase 4: Add Lint Enforcement | 2-3 hrs | ✅ Complete | Validation script created |
| Phase 5: Documentation | 1-2 hrs | ✅ Complete | AGENTS.md updated |
| **Total** | **9-15 hrs** | | |

---

## Document Metadata

**Version:** 1.0  
**Last Updated:** February 3, 2026  
**Status:** Planning  
**Audience:** Development team, technical leads  
**Related Documents:**
- AGENTS.md (to be updated)
- `.github/instructions/database.instructions.md` (to be created)
- `docs/engineering-guidelines.md` (to be updated)
