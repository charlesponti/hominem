# Fix Hono Client Type Error

## TL;DR

> **Quick Summary**: Fix missing `OptimisticUpdateConfig` type definition in `packages/hono-client` preventing typecheck from passing.
> 
> **Deliverables**: 
> - Type definition added to `src/react/hooks.ts`
> - Type exported from `src/react/index.ts`
> - Type imported in `src/react/optimistic.ts`
> - All 21 packages pass typecheck
> 
> **Estimated Effort**: Quick (single file changes, ~15 minutes)
> **Parallel Execution**: NO - sequential (3 simple edits)
> **Critical Path**: Define type → Export type → Import type → Verify

---

## Context

### Original Request
Fix the type error in `packages/hono-client` that is preventing the package from passing typecheck (1 of 21 packages failing).

### Interview Summary
**Key Discussions**:
- Type audit report shows 20/21 packages passing
- Only `packages/hono-client` has type errors
- Error: `Cannot find name 'OptimisticUpdateConfig'` at line 34 of `optimistic.ts`
- Performance is otherwise excellent (98% cache hit rate)

**Research Findings**:
- Type is used in `useHonoMutationWithOptimistic` hook but never defined
- Similar types (`HonoQueryOptions`, `HonoMutationOptions`) exist in `hooks.ts`
- `QueryKey` type already imported from `@tanstack/react-query`
- No test files exist in hono-client package (manual verification only)
- Error only appears with direct `tsc --noEmit` (turbo cache can miss it)

### Metis Review
**Identified Gaps** (addressed):
- Gap: Test strategy unclear → Resolved: Manual verification via typecheck (no tests in package)
- Gap: Scope boundaries → Resolved: Only fix the type error, don't add tests or refactor

---

## Work Objectives

### Core Objective
Define the missing `OptimisticUpdateConfig` TypeScript interface to fix the type error in `packages/hono-client`.

### Concrete Deliverables
- `OptimisticUpdateConfig` interface defined in `packages/hono-client/src/react/hooks.ts`
- Type exported from `packages/hono-client/src/react/index.ts`
- Type imported in `packages/hono-client/src/react/optimistic.ts`

### Definition of Done
- [ ] Run `cd packages/hono-client && bunx tsc --noEmit` → Exit code 0 (no errors)
- [ ] Run `bun run typecheck --filter @hominem/hono-client` → Exit code 0
- [ ] Run `bun run typecheck` (full monorepo) → All 21 packages pass

### Must Have
- Interface with all 7 parameters used by the hook
- Generic type parameters: `TData`, `TVariables`, `TContext`
- Proper React Query types (`QueryKey`)
- Proper Hono client types (`HonoClient`)

### Must NOT Have (Guardrails)
- ❌ No behavioral changes (only type definitions)
- ❌ No refactoring of existing code
- ❌ No changes to function implementations
- ❌ No test file creation (package has no test infrastructure)
- ❌ No documentation updates (beyond inline JSDoc if needed)
- ❌ No dependency version changes

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest 4.0.16 configured in monorepo)
- **User wants tests**: NO (simple type fix, no behavioral changes, no existing tests in package)
- **Framework**: N/A (manual verification only)

### Automated Verification Only (NO User Intervention)

Each TODO includes EXECUTABLE verification procedures that agents can run directly.

**For TypeScript type fixes** (using Bash tsc):
```bash
# Agent runs from package directory:
cd packages/hono-client
bunx tsc --noEmit
# Assert: Exit code 0
# Assert: No output (no errors)

# Agent runs from monorepo root:
bun run typecheck --filter @hominem/hono-client
# Assert: Exit code 0
# Assert: Output contains "cache hit" or "cache miss" but no errors

# Final verification - full monorepo:
bun run typecheck
# Assert: All 21 packages pass
# Assert: Exit code 0
```

**Evidence Requirements (Agent-Executable):**
- Terminal output from `tsc --noEmit` showing zero errors
- Terminal output from `turbo typecheck` showing all packages passing
- Exit codes captured (0 = success)

---

## Execution Strategy

### Parallel Execution Waves

Sequential execution only (dependencies between all tasks).

```
Wave 1 (Sequential - All tasks depend on previous):
├── Task 1: Define OptimisticUpdateConfig in hooks.ts
│   └── Blocks: Task 2 (needs type to exist before export)
├── Task 2: Export type from react/index.ts  
│   └── Blocks: Task 3 (needs export before import)
└── Task 3: Import type in optimistic.ts
    └── Blocks: Nothing (final task)

Critical Path: Task 1 → Task 2 → Task 3
Parallel Speedup: None (all sequential)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (sequential required) |
| 2 | 1 | 3 | None (sequential required) |
| 3 | 2 | None | None (final task) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | Single agent, sequential execution. Category: "quick" |

---

## TODOs

> Implementation only (no tests exist in package).
> EVERY task MUST have: Recommended Agent Profile + Parallelization info.

- [ ] 1. Define OptimisticUpdateConfig interface in hooks.ts

  **What to do**:
  - Open `packages/hono-client/src/react/hooks.ts`
  - Add the `OptimisticUpdateConfig` interface after the existing `HonoMutationOptions` interface
  - Include all 7 parameters: `queryKey`, `mutationFn`, `updateFn`, `onSuccess`, `onError`, `successMessage`, `errorMessage`
  - Use generic type parameters: `TData`, `TVariables`, `TContext = { previousData: TData | undefined }`
  - Import types are already available: `QueryKey` from `@tanstack/react-query`, `HonoClient` from `../core/client`

  **Must NOT do**:
  - Don't modify existing interfaces or functions
  - Don't add JSDoc comments (keep it simple)
  - Don't change import statements (all needed imports exist)
  - Don't reorder existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple type definition addition, single file, straightforward task
  - **Skills**: None needed (basic TypeScript editing)
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed (no UI changes)
    - `git-master`: Not needed (no git operations yet)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only (Wave 1, Task 1)
  - **Blocks**: Tasks 2 and 3 (type must exist before export/import)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `packages/hono-client/src/react/hooks.ts:14-26` - `HonoQueryOptions` and `HonoMutationOptions` interfaces (follow same style)
  - `packages/hono-client/src/react/hooks.ts:1-8` - Import statements pattern (use existing imports, don't add new ones)

  **API/Type References** (contracts to implement against):
  - `packages/hono-client/src/react/optimistic.ts:22-34` - Function signature showing exactly what parameters are needed
  - `@tanstack/react-query` types: `QueryKey` (already imported)
  - `packages/hono-client/src/core/client.ts:10` - `HonoClient` type (already imported via `type HonoClient`)

  **Type Definition Structure**:
  ```typescript
  export interface OptimisticUpdateConfig<
    TData,
    TVariables,
    TContext = { previousData: TData | undefined }
  > {
    queryKey: QueryKey;
    mutationFn: (client: HonoClient, variables: TVariables) => Promise<TData>;
    updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
    successMessage?: string;
    errorMessage?: string;
  }
  ```

  **WHY Each Reference Matters**:
  - `HonoQueryOptions` pattern: Shows naming convention (Config suffix), export statement, generic parameters
  - Function signature in `optimistic.ts`: Shows exact parameters being destructured (these must match interface properties)
  - Existing imports: All needed types (`QueryKey`, `HonoClient`) are already imported, don't add duplicates

  **Acceptance Criteria**:

  **Automated Verification** (using Bash tsc):
  ```bash
  # Agent runs from package directory:
  cd packages/hono-client
  bunx tsc --noEmit --pretty false 2>&1
  # Assert: Exit code 0
  # Assert: No output containing "error TS" (no TypeScript errors)
  # Assert: If any output, should only be cache/config messages, not errors
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing `tsc --noEmit` exit code 0
  - [ ] No error messages in output

  **Commit**: NO (will commit all changes together after Task 3)

---

- [ ] 2. Export OptimisticUpdateConfig from react/index.ts

  **What to do**:
  - Open `packages/hono-client/src/react/index.ts`
  - Add export statement: `export type { OptimisticUpdateConfig } from './hooks';`
  - Place it after the existing `export type { HonoQueryOptions, HonoMutationOptions } from './hooks';` line

  **Must NOT do**:
  - Don't modify existing exports
  - Don't reorder existing exports
  - Don't add default export
  - Don't add comments

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition to existing export list
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills omitted (trivial export statement)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only (Wave 1, Task 2)
  - **Blocks**: Task 3 (type must be exported before import)
  - **Blocked By**: Task 1 (type must be defined before export)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `packages/hono-client/src/react/index.ts:7` - Existing type export pattern: `export type { HonoQueryOptions, HonoMutationOptions } from './hooks';`
  - Follow exact same format: `export type { ... } from './hooks';`

  **WHY Each Reference Matters**:
  - Line 7 pattern: Shows the exact syntax for exporting types from hooks.ts (use type-only export with `export type`)

  **Acceptance Criteria**:

  **Automated Verification** (using Bash tsc):
  ```bash
  # Agent runs from package directory:
  cd packages/hono-client
  bunx tsc --noEmit --pretty false 2>&1
  # Assert: Exit code 0
  # Assert: No output containing "error TS"
  
  # Verify export exists (can be imported):
  bunx tsc --noEmit --traceResolution 2>&1 | grep -i "OptimisticUpdateConfig"
  # Assert: Should show the type being resolved from hooks.ts
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing `tsc --noEmit` exit code 0

  **Commit**: NO (will commit all changes together after Task 3)

---

- [ ] 3. Import OptimisticUpdateConfig in optimistic.ts

  **What to do**:
  - Open `packages/hono-client/src/react/optimistic.ts`
  - Add import statement after existing imports: `import type { OptimisticUpdateConfig } from './hooks';`
  - Place it after line 3 (after `import { useHonoClient } from './context';`)

  **Must NOT do**:
  - Don't modify the function implementation
  - Don't modify any other imports
  - Don't add comments
  - Don't reorder existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single import statement addition
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills omitted (trivial import)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only (Wave 1, Task 3 - final task)
  - **Blocks**: Nothing (final task)
  - **Blocked By**: Tasks 1 and 2 (type must be defined and exported before import)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `packages/hono-client/src/react/optimistic.ts:1-3` - Existing import pattern (use `import type` for type-only imports)

  **Import Statement**:
  ```typescript
  import type { OptimisticUpdateConfig } from './hooks';
  ```

  **WHY Each Reference Matters**:
  - Existing imports show the pattern: Use `import type` for types, relative path `'./hooks'`

  **Acceptance Criteria**:

  **Automated Verification** (using Bash tsc):
  ```bash
  # Agent runs from package directory:
  cd packages/hono-client
  bunx tsc --noEmit --pretty false 2>&1
  # Assert: Exit code 0
  # Assert: No output containing "error TS2304" (Cannot find name)
  # Assert: No output containing "OptimisticUpdateConfig" errors
  
  # Final verification - full monorepo typecheck:
  cd ../..
  bun run typecheck --filter @hominem/hono-client 2>&1
  # Assert: Exit code 0
  # Assert: Output contains "typecheck" task completion
  # Assert: No error messages
  
  # Ultimate verification - all packages:
  bun run typecheck 2>&1 | grep -E "(error|✓|cache)"
  # Assert: Exit code 0
  # Assert: All 21 packages show "cache hit" or "cache miss" with no errors
  ```

  **Evidence to Capture:**
  - [ ] Terminal output from `tsc --noEmit` in package directory (exit code 0)
  - [ ] Terminal output from `turbo typecheck --filter @hominem/hono-client` (exit code 0)
  - [ ] Terminal output from full monorepo `turbo typecheck` showing all 21 packages passing

  **Commit**: YES
  - Message: `fix(hono-client): add missing OptimisticUpdateConfig type`
  - Files: 
    - `packages/hono-client/src/react/hooks.ts`
    - `packages/hono-client/src/react/index.ts`
    - `packages/hono-client/src/react/optimistic.ts`
  - Pre-commit: `bun run typecheck --filter @hominem/hono-client`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `fix(hono-client): add missing OptimisticUpdateConfig type` | hooks.ts, index.ts, optimistic.ts | `bun run typecheck --filter @hominem/hono-client` |

---

## Success Criteria

### Verification Commands
```bash
# Package-level verification
cd packages/hono-client && bunx tsc --noEmit
# Expected: Exit code 0, no errors

# Turbo verification (with cache)
bun run typecheck --filter @hominem/hono-client
# Expected: Exit code 0, task completes successfully

# Full monorepo verification
bun run typecheck
# Expected: All 21 packages pass, exit code 0
```

### Final Checklist
- [ ] All "Must Have" present (7 parameters, generic types, proper imports)
- [ ] All "Must NOT Have" absent (no behavioral changes, no refactoring)
- [ ] Type error resolved: `Cannot find name 'OptimisticUpdateConfig'` is gone
- [ ] All 21 packages pass typecheck
- [ ] Turbo cache works correctly (subsequent runs should hit cache)
