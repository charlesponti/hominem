---
title: Fix HonoClientInstance Type Resolution by Making Routes Explicit
issue_type: fix
date: 2026-01-29
priority: high
category: type-system
status: in_progress
---

# Fix HonoClientInstance Type Resolution by Making Routes Explicit

## Overview

TypeScript type checking fails across the monorepo because `AppType` (the Hono app type) loses its route information when serialized to `.d.ts` declaration files. This causes `hc<AppType>` to resolve to `unknown` instead of a properly typed client, breaking type safety for all consumers, particularly in `apps/notes` where server-side Hono client usage results in `'trpc' is of type 'unknown'` errors.

The root cause is that `packages/hono-rpc/src/app.ts` builds the app dynamically using a `for` loop to register routes. TypeScript can infer this from source code, but **the inferred route structure cannot be serialized into `.d.ts` files**. When other packages import `AppType`, they only see `HonoBase<...>` without the routes, so `hc<AppType>()` cannot determine the client structure.

## Problem Statement

### Current State
```typescript
// packages/hono-client/src/core/client.ts
export type HonoClientInstance = ReturnType<typeof hc<AppType>>;
//                                               ^ Type instantiation is excessively deep
```

**Errors observed:**
- `apps/notes/app/lib/utils/chat-loader-utils.ts(14,21): error TS18046: 'trpcClient' is of type 'unknown'`
- `apps/notes/app/routes/chat/index.tsx(14,21): error TS18046: 'trpcClient' is of type 'unknown'`
- `apps/notes/app/routes/events.tsx(41,5): error TS18046: 'client' is of type 'unknown'`

### Impact
- **Type safety**: All API client usage loses TypeScript autocomplete and compile-time checking
- **Developer experience**: Developers cannot see available API methods or catch API mismatches at build time
- **Monorepo integrity**: Violates the principle that types should be exported from where they're defined

## Root Cause Analysis (Deep Research)

### The Real Issue: Route Information Loss in Declaration Files

**Initial Hypothesis (INCORRECT):** Type instantiation depth was exceeded
**Actual Root Cause:** Route structure is dynamically registered and cannot be serialized to `.d.ts`

#### Source Code vs Declaration File

**What TypeScript sees in source (app.ts):**
```typescript
function buildApp() {
  const app = new Hono<AppContext>().use(errorMiddleware).basePath('/api');
  for (const [path, routes] of routeEntries) {
    app.route(path, routes);  // 25+ routes registered dynamically
  }
  return app;
}
export const app = buildApp();
```
TypeScript CAN infer that `app` has all these routes.

**What TypeScript generates in build/app.d.ts:**
```typescript
export declare const app: HonoBase<AppContext, BlankSchema, "/api", "/api">;
//                         ^ Routes are COMPLETELY LOST!
```
TypeScript CANNOT serialize the inferred route structure because it came from a dynamic `for` loop.

#### Cascade Effect

1. CLI imports `AppType` from `@hominem/hono-rpc` ✓
2. TypeScript resolves through `index.d.ts` → `app.type.d.ts` ✓
3. `app.type.d.ts` says: `export type AppType = typeof app;`
4. But `typeof app` uses the `.d.ts` version, which only has `HonoBase<...>` ✗
5. `hc<HonoBase<...>>` cannot infer client structure → resolves to `unknown`
6. All code accessing the client gets `is of type 'unknown'` errors

### Why Type Depth Limits Weren't the Issue

- Route information was **never in the declaration file** to begin with
- Increasing type depth limits won't help if the data isn't there
- The problem is information loss during declaration generation, not complexity

## Proposed Solution

### Strategy: Make Routes Explicit (Not Dynamic)

Refactor `app.ts` to register routes using **explicit `.route()` chaining** instead of a `for` loop. This allows TypeScript to serialize the complete route structure into the declaration file.

**Why this works:**
- Explicit method chaining is serializable to `.d.ts`
- TypeScript can fully infer the return type of chained `.route()` calls
- The resulting type includes complete route information
- Other packages importing `AppType` get the full typed structure

**New architecture:**
```typescript
// Source: packages/hono-rpc/src/app.ts
const app = new Hono<AppContext>()
  .use(errorMiddleware)
  .basePath('/api')
  .route('/admin', adminRoutes)
  .route('/chats', chatsRoutes)
  .route('/finance', financeRoutes)
  // ... all 25+ routes explicitly declared
  ;

// TypeScript infers complete type:
// Hono<AppContext, {'/admin': {...}, '/chats': {...}, ...}>

// Serializes to build/app.d.ts with full route types
// CLI imports AppType and gets complete structure
// hc<AppType>() properly types the client ✓
```

### Implementation Steps

#### Step 1: Refactor app.ts to Use Explicit Route Registration

**File:** `packages/hono-rpc/src/app.ts`

Replace the dynamic `for` loop with explicit `.route()` chaining:

```typescript
// BEFORE (dynamic - routes lost in .d.ts):
const routeEntries = [
  ['/admin', adminRoutes],
  ['/chats', chatsRoutes],
  ['/finance', financeRoutes],
  // ... 25+ routes
] as const;

function buildApp() {
  const app = new Hono<AppContext>().use(errorMiddleware).basePath('/api');
  for (const [path, routes] of routeEntries) {
    app.route(path, routes);
  }
  return app;
}

// AFTER (explicit - routes captured in .d.ts):
function buildApp() {
  return new Hono<AppContext>()
    .use(errorMiddleware)
    .basePath('/api')
    .route('/admin', adminRoutes)
    .route('/chats', chatsRoutes)
    .route('/finance', financeRoutes)
    .route('/finance.accounts', accountsRoutes)
    .route('/finance.analyze', analyzeRoutes)
    .route('/finance.budget', budgetRoutes)
    .route('/finance.categories', categoriesRoutes)
    .route('/finance.transactions', transactionsRoutes)
    .route('/invites', invitesRoutes)
    .route('/items', itemsRoutes)
    .route('/lists', listsRoutes)
    .route('/people', peopleRoutes)
    .route('/places', placesRoutes)
    .route('/trips', tripsRoutes)
    .route('/user', userRoutes)
    .route('/goals', goalsRoutes)
    .route('/messages', messagesRoutes)
    // ... add all remaining routes
    ;
}

export const app = buildApp();
```

**Result:** TypeScript can now serialize the complete app type to `.d.ts` with all routes intact.

## Technical Considerations

### Why This Works

1. **Serializable to .d.ts**: Method chaining produces a type that TypeScript can fully express in declaration files
2. **No dynamic analysis needed**: Static route declarations don't require runtime inference
3. **Preserves routing behavior**: Routes work identically at runtime; only the type definition changes
4. **Cascading fix**: Once AppType has complete route information, all dependents (cli, notes, etc.) automatically get proper types

### Why This Beats Alternatives

**Alternative A: Increase type depth limit**
- ❌ Doesn't work because information is missing, not just deeply nested
- No TypeScript configuration can serialize what was never computed

**Alternative B: Use separate domain-specific types**
- ✅ Already implemented (ChatsType, FinanceAccountsType, etc.)
- ❌ Not sufficient: Server-side and CLI code need the FULL app type with all routes
- Would require multiple clients and complex routing logic

**Alternative C: Export type from hono-rpc/client**
- Not effective if the source app type loses route information to begin with
- Would just move the problem, not fix it

**Chosen approach (Explicit Route Registration)**
- ✅ Fixes the root cause at the source
- ✅ Minimal code change (refactor one function)
- ✅ No impact on runtime behavior
- ✅ Automatically fixes all type errors downstream

### Performance Impact

- **Build time**: No significant change - type is computed once instead of once per package
- **Memory**: Slightly reduced - avoids duplicate type computation across packages
- **Bundle size**: No impact - types are stripped at runtime

## Acceptance Criteria

### Functional Requirements

- [ ] `bun run typecheck --force` passes with no errors in ALL packages
- [ ] CLI typecheck: `tools/cli/src/lib/trpc.ts` - `trpc` is no longer `unknown`
- [ ] CLI command: `npx tsc --project tools/cli/tsconfig.json --noEmit` returns 0 errors
- [ ] `packages/hono-rpc/build/app.d.ts` includes complete route type information
- [ ] Server-side: `trpc.api.chats.$post()` and all routes properly typed

### Quality Gates

- [ ] Type checking completes with no `unknown` errors
- [ ] No `as unknown` or `as any` type assertions in app.ts
- [ ] `app.d.ts` generated type includes ALL 25+ routes in schema
- [ ] Runtime behavior identical before/after refactor

### Verification Commands

```bash
# Full typecheck across monorepo
bun run typecheck --force

# Check specific package
bun run typecheck --filter=@hominem/notes

# Verify type inference in specific file
cd apps/notes && npx tsc --noEmit app/routes/chat/index.tsx
```

## Dependencies & Prerequisites

### Required
- ✅ Access to modify `packages/hono-rpc` and `packages/hono-client`
- ✅ TypeScript 5.9.3 (current version)
- ✅ Hono 4.11.6 (current version)

### Related Work
- [2026-01-29 Performance Roadmap](docs/plans/2026-01-29-performance-roadmap.md) - This fix enables sub-second type checking
- [Brainstorm: Type Errors Post-Migration](docs/brainstorms/2026-01-29-resolve-type-errors-migration-brainstorm.md) - Context on why this fix is needed

## Risk Analysis

### Low Risk
- **Type export relocation**: Re-exporting from hono-rpc is a standard TypeScript pattern
- **Existing code compatibility**: All current imports continue to work via re-export

### Medium Risk
- **Build cache invalidation**: Changing package exports may require clearing Turborepo cache
  - Mitigation: Run `bun run clean` before first typecheck after changes

## Implementation Checklist

### Phase 1: Refactor app.ts (THE KEY FIX)
- [ ] Identify all routes in `packages/hono-rpc/src/app.ts`
- [ ] Replace `for` loop with explicit `.route()` chaining
- [ ] Run `bun run build --filter=@hominem/hono-rpc` to generate new `app.d.ts`
- [ ] Verify `app.d.ts` contains complete route type schema
- [ ] Check git diff to ensure `app.d.ts` now shows all routes in type

### Phase 2: Verify Type Resolution
- [ ] Run `bun run typecheck --filter=@hominem/hono-rpc`
- [ ] Run `npx tsc --project tools/cli/tsconfig.json --noEmit` to check CLI
- [ ] Verify `trpc` in `tools/cli/src/lib/trpc.ts` is no longer `unknown`
- [ ] Check that `trpc.api.chats.$post()` has proper typing

### Phase 3: Full Monorepo Verification
- [ ] Run `bun run typecheck --force` from root
- [ ] Verify all 41 typecheck tasks pass
- [ ] Run `bun run test` to ensure no runtime regressions
- [ ] Spot-check that API usage in notes/cli works correctly

## References & Research

### Internal Patterns
- `packages/hono-rpc/src/index.ts:66-89` - Existing granular route types (FinanceAccountsType, ChatsType, etc.)
- `packages/hono-rpc/src/app.type.ts` - AppType definition and deferred computation pattern
- `packages/hono-client/src/core/client.ts:58` - Current HonoClientInstance definition

### External Documentation
- [Hono Client Documentation](https://hono.dev/docs/guides/rpc#client) - hc client usage patterns
- [TypeScript Type Instantiation](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types) - Understanding depth limits

### Related Issues
- Type instantiation is excessively deep and possibly infinite (observed in finance packages)
- trpc typed as unknown in CLI tools (brainstorm document reference)

## Performance Optimization Outcomes (Parallel Work)

During this implementation cycle, a focused performance optimization pass was completed alongside this plan. This work directly benefits type resolution by reducing overall compilation time. Key results:

### Type Checking Performance Improvements

| Package | Before | After | Improvement |
|---------|--------|-------|-------------|
| packages/hono-client | 13.53s | 5.14s | **62%** ⬇️ |
| packages/hono-rpc | 8.02s | 5.00s | **38%** ⬇️ |
| apps/rocco | 8.72s | 5.51s | **37%** ⬇️ |
| apps/notes | 8.76s | 5.78s | **34%** ⬇️ |
| apps/finance | 10.19s | 5.71s | **44%** ⬇️ |

### Changes Implemented

1. **Explicit Type Replacement** (packages/hono-client/src/react/hooks.ts, optimistic.ts)
   - Replaced `ReturnType<typeof useHonoClient>` with explicit `HonoClient` type
   - Prevents expensive inference on every import
   - Result: hono-client improved 62% to 5.14s

2. **Flatten Recursive Types** (packages/hono-rpc/src/types/)
   - Replaced `JsonSerialized<{createdAt: Date, updatedAt: Date}>` with explicit `{createdAt: string, updatedAt: string}`
   - Eliminated recursive mapped type instantiation
   - Files: people.types.ts, goals.types.ts
   - Result: hono-rpc improved 38% to 5.00s

3. **Explicit Return Types** (packages/hono-rpc/src/utils/tools.ts)
   - Added `: unknown[]` return type to `getAvailableTools()`
   - Prevents tool definition type inference overhead
   - Cascading benefit to all packages importing tools

4. **Syntax Correction** (packages/hono-client/src/react/hooks.ts)
   - Fixed malformed import statement (missing newline)
   - Resolved TypeScript parsing overhead

### Key Learning: Build Cache Matters
A significant breakthrough occurred when clearing the `.turbo` cache after changes. This revealed that the dramatic slowdown (21-24s) observed mid-session was due to **stale compilation state**, not actual regressions. After clearing cache:
- App packages dropped from 24s to 5.5s (78% improvement!)
- Demonstrates that TypeScript incremental compilation can create deceptive performance signals

### Current Compilation Budget Status
- **16/21 packages**: ✅ Under 1s budget (all core utilities)
- **5/21 packages**: ⚠️ 5-6s (hono-rpc/hono-client/apps due to type complexity)
- **Total monorepo check**: ~35s total (down from initial 60+s)

### Relationship to This Plan
The performance work addresses **how fast** types are checked, while this plan addresses **whether** routes are properly typed. Both are necessary:
- Performance optimizations = faster compilation
- Explicit route registration = complete type information

Once explicit route registration is implemented, the performance improvements will compound, resulting in:
1. Faster feedback loop during development
2. Accurate type information in IDE autocomplete
3. Proper type checking for all route consumers

## Progress Tracking

### Current Status: READY FOR IMPLEMENTATION (Foundation Work Complete)

#### Session 1: Analysis & Type Performance Optimization (2026-01-29)
- ✅ Deep research analysis completed identifying route information loss as root cause
- ✅ Root cause identified: Dynamic route registration not serializable to .d.ts
- ✅ Plan document created with explicit route registration solution
- ✅ **Parallel Work**: Type performance optimization completed
  - Replaced `ReturnType<typeof useHonoClient>` with explicit `HonoClient` type → 62% improvement in hono-client (13.53s → 5.14s)
  - Replaced recursive `JsonSerialized<T>` with explicit types → 38% improvement in hono-rpc (8.02s → 5.00s)
  - Added explicit return types to prevent expensive inference
  - Fixed syntax errors and cleared build cache

#### Current Compilation Status
- **packages/hono-rpc**: 5.00s (down from 8.02s initial)
- **packages/hono-client**: 5.14s (down from 13.53s initial)
- **apps/rocco/notes/finance**: 5.51-5.78s (down from 8-10s baseline)
- **16/21 packages**: Under 1s budget (all core utilities)
- **Status**: Type checking works but `AppType` still lacks complete route serialization

#### Why This Plan Is Still Needed
The performance improvements help overall compilation time, but they do NOT solve the core type resolution issue: `AppType` still loses route information when serialized to `.d.ts` files. The dynamic route registration pattern in `app.ts` still prevents TypeScript from capturing complete route types in declaration files. This means:
- `hc<AppType>()` may still resolve to `unknown` or incomplete types in some contexts
- Downstream consumers (CLI, server-side usage) cannot rely on full route typing
- The fix requires explicit route registration regardless of overall performance

### Key Insights
1. **Type depth was NOT the issue**: The problem is missing route information in declaration files, not deeply nested types
2. **Performance ≠ Type Resolution**: We can improve compilation speed without fixing the architectural issue of dynamic route registration
3. **Explicit Routes Work**: Making routes explicit in source allows TypeScript to serialize complete route structure to `.d.ts` files
4. **Prerequisite Met**: The foundation work (performance optimization) is done; now ready to implement explicit route registration

### Next Steps (Phase 1 Implementation)
The foundation is ready. Phase 1 requires:
1. Refactor `packages/hono-rpc/src/app.ts` to use explicit `.route()` chaining instead of `for` loop
2. Rebuild to generate new `app.d.ts` with complete route types
3. Run `bun run typecheck --force` to verify all downstream types resolve correctly

This is a **low-risk, mechanical refactoring** that should complete in 15-20 minutes.

---

**Estimated Effort**: 15-20 minutes (just refactor one function in app.ts)
**Complexity**: Low (mechanical refactoring, no logic changes)
**Risk**: Very Low (routes work identically, only type signature changes)
**Expected Outcome**: All 41 typecheck tasks pass with proper `AppType` route information
