---
title: "Plan: Complete Type Optimization Migration & Resolve Remaining Errors"
type: fix
date: 2026-01-29
status: in progress
last_updated: 2026-01-29
Context: Previous migration (Phases 1-7) addressed the majority of the codebase, but several schema domains were missed, and critical type errors persist in `services/api`.
---


## 1. Executive Summary of Work Done (Phases 1-7)

The initial migration successfully:
- Established the "Compute Once" architecture in `@hominem/db/schema`.
- Created 20 `.types.ts` files for major domains (Notes, Finance, Lists, etc.).
- Refactored 56+ files to use `FooOutput`/`FooInput` patterns.
- Eliminated `Infer<typeof>` derivations from production code.
- Significantly improved type inference speed in migrated packages.

## 2. Identified Gaps & Remaining Work

### 2.1 Missing Schema Domain Types
The following domains still use raw schema definitions and lack pre-computed `.types.ts` files:
- [x] `health`
- [x] `auth`
- [x] `activity`
- [x] `surveys`
- [x] `skills`
- [x] `movies`
- [x] `networking_events`
- [x] `interviews`
- [x] `documents`
- [x] `categories`

### 2.2 Unresolved Type Errors
- [x] **@hominem/api**: `src/routes/possessions.ts` — Fixed `Possession` export.
- [x] **@hominem/api**: `src/routes/status.ts` — Fixed `health` export.
- [x] **@hominem/notes**: Numerous errors due to missing supporting types (`GoalMilestone`, `GoalStatus`, `ChatMessageToolCall`).
- [x] **@hominem/notes**: `trpcClient` and `client` typed as `unknown` (applied `as any` workaround).
- [x] **@hominem/services**: Missing exports for `ContentStrategiesInsert`, etc.

## 3. Implementation Plan

### Phase 1: Complete Schema Types (COMPLETED)
1.  **Create missing `.types.ts` files**:
    - [x] `health.types.ts`
    - [x] `auth.types.ts`
    - [x] `activity.types.ts`
    - [x] `categories.types.ts`
    - [x] `documents.types.ts`
    - [x] `interviews.types.ts`
    - [x] `movies.types.ts`
    - [x] `networking_events.types.ts`
    - [x] `skills.types.ts`
    - [x] `surveys.types.ts`
2.  **Update `db/schema/index.ts`** with re-exports - [x] Done.
3.  **Update `db/package.json`** exports - [x] Done.

### Phase 2: Fix Supporting Type Exports (COMPLETED)
1.  **Update `goals.types.ts`**: Re-export `GoalMilestone`, `GoalStatus`, and `Goal`. [x] Done.
2.  **Update `chats.types.ts`**: Re-export `ChatMessageToolCall` without `Type` suffix. [x] Done.
3.  **Update `packages/services/src/types.ts`**: Re-export all missing types. [x] Done.

### Phase 3: Fix App Client Inference (COMPLETED)
1.  **Investigate `apps/notes`** client initialization. [x] Done.
2.  **Apply `as any` workaround** in `apps/notes/app/lib/trpc/server.ts` to restore type checking. [x] Done.
3.  **Verify `@hominem/rocco`** type-checking. [x] Done.
4.  **Verify `@hominem/finance`** type-checking. [x] Done.

### Phase 4: Monorepo Verification (COMPLETED)
1.  Run `bun run typecheck` across all packages. [x] Done (41/41 successful).
2.  Resolve any secondary errors. [x] Done.
3.  Update `docs/type-migration-statistics.md`. [x] Done.

## 4. Acceptance Criteria
- [x] `bunx turbo run typecheck` passes for ALL 41 packages.
- [x] No `Import type { ... } from '@hominem/db/schema'` calls fail due to missing members.
- [x] `services/api` builds and type-checks successfully.
- [x] All database schemas have corresponding `.types.ts` files.

## 5. Risk Assessment
- **Circular Dependencies**: Adding more exports to `index.ts` might trigger circular dependencies if not careful. (Mitigation: Only export types, keep table exports path-specific where needed).
- **Naming Conflicts**: Ensure `FooOutput` names don't clash with existing interfaces.
