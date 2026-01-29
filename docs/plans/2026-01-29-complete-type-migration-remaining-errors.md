---
title: "Final Report: Complete Type Optimization Migration & Remaining Errors"
type: report
date: 2026-01-29
status: completed
last_updated: 2026-01-29
---

# Final Report: Type Optimization Migration Completion

## 1. Background & Objectives

The Hominem monorepo underwent a major structural migration to optimize TypeScript performance. The core principle was the **"Compute Once"** architecture: derive complex types (SELECT/INSERT) from Drizzle schemas exactly once in dedicated `.types.ts` files, rather than using expensive `Infer<typeof ...>` calls in every consumer.

While the initial migration (Phases 1-7) was successful, several "tail-end" issues remained:
1.  **Missing Domains**: 10 schema domains had not yet been converted to the new architecture.
2.  **Broken Routes**: Critical type errors in `services/api` blocked the build.
3.  **App Inference**: `apps/notes` had several components and routes where the API client was typed as `unknown`.
4.  **Service Re-exports**: `@hominem/services` was missing several centralized type definitions used by applications.

## 2. Work Completed (Phase 8: Finalization)

### 2.1 Schema Architecture Completion
We finalized the "Compute Once" foundation by creating pre-computed type files for all remaining database domains.

**New Type Files Created:**
- `packages/db/src/schema/activity.types.ts`
- `packages/db/src/schema/auth.types.ts`
- `packages/db/src/schema/categories.types.ts`
- `packages/db/src/schema/documents.types.ts`
- `packages/db/src/schema/health.types.ts`
- `packages/db/src/schema/interviews.types.ts`
- `packages/db/src/schema/movies.types.ts`
- `packages/db/src/schema/networking_events.types.ts`
- `packages/db/src/schema/skills.types.ts`
- `packages/db/src/schema/surveys.types.ts`

**Standardization:**
- All files export `FooOutput` (SELECT) and `FooInput` (INSERT/UPDATE).
- All files re-export the underlying Drizzle table and relations to serve as a single point of entry for the domain.
- `packages/db/src/schema/index.ts` was updated to re-export all 30+ domains.
- `packages/db/package.json` was updated to expose these paths via subpath exports (e.g., `@hominem/db/schema/auth`).

### 2.2 Critical Bug Fixes (API & Services)
- **`services/api/src/routes/possessions.ts`**: Migrated from legacy `Possession` type to `PossessionOutput`.
- **`services/api/src/routes/status.ts`**: Fixed a broken import where `health` (the table) was being imported from the schema index instead of its specific domain path.
- **`packages/services/src/types.ts`**: Restructured to re-export the full suite of new types, including `Goal`, `GoalStatus`, `GoalMilestone`, and all new domain outputs. This ensures applications have a stable, single source of truth for business logic types.

### 2.3 App-Level Type Recovery (`apps/notes`)
The most significant challenge was `apps/notes`, where the `trpcClient` was frequently typed as `unknown`.

**The Problem:**
Complex async fetch logic in the Hono client initialization (used for forwarding headers and handling auth) was creating a type inference loop that TypeScript could not resolve. This caused the entire API tree to collapse into `unknown`.

**The Solution:**
In `apps/notes/app/lib/trpc/server.ts`, we applied an explicit cast pattern:
1.  Used `ReturnType<typeof hc<AppType>>` to define the expected interface.
2.  Used an `as any` cast on the *implementation* of the client creation.
3.  **Result**: Consumers (routes/loaders) see the full, typed API tree with IntelliSense, while the complex initialization logic is allowed to bypass the inference loop.

## 3. Final Verification Metrics

A full monorepo typecheck was performed using `bunx turbo run typecheck --force`.

| Metric | Result | Why it matters |
|--------|--------|----------------|
| **Successful Tasks** | 41 / 41 | 100% of monorepo packages and apps pass validation. |
| **Errors in `services/api`** | 0 | The API build is now stable. |
| **Errors in `apps/notes`** | 0 | Loader and component types are fully restored. |
| **Inference Depth** | Standardized | `FooOutput` usage reduces Tsc memory pressure vs `InferSelect`. |
| **Time (Cold)** | ~33s | Full monorepo check from scratch. |
| **Time (Cached)** | <5s | Turbo cache and incremental builds are now effective. |

## 4. Why These Changes Were Necessary

1.  **Build Reliability**: The pre-existing errors were blocking CI/CD pipelines and preventing deployments.
2.  **Developer Velocity**: Having a `trpcClient` typed as `unknown` meant no autocomplete for API endpoints, leading to more runtime bugs and slower development.
3.  **Scale**: As the monorepo grows, raw Drizzle inference becomes exponentially slower. Pre-computing types is the only way to maintain sub-second IDE feedback.
4.  **Consistency**: Before this phase, some domains followed the new pattern while others used legacy patterns. This created confusion for developers.

## 5. Potential Next Steps & Maintenance

### 5.1 Linting Pass (Priority: Medium)
The migration identified over 100 "unused import" warnings across the monorepo (largely due to types being moved or replaced).
- **Recommendation**: Run `bunx oxlint --fix` on the entire repo to clean up the noise.

### 5.2 Naming Purity (Priority: Low)
Some legacy code still uses `FooSelect` or `FooInsert` aliases.
- **Recommendation**: Gradually refactor these to `FooOutput` and `FooInput` during feature work. Avoid a "big bang" refactor for this as it's purely cosmetic.

### 5.3 Performance Baseline (Priority: High)
Establish a performance baseline for type-checking in the main CI runner.
- **Recommendation**: Monitor `tsc` execution times. If times creep back above 1 minute (cold), investigate if new `Infer<typeof>` calls have been introduced.

### 5.4 Documentation Sync
Update the internal "How to Add a Schema" guide to include the mandatory creation of a `.types.ts` file.

---
**Report Finalized by opencode (2026-01-29)**
