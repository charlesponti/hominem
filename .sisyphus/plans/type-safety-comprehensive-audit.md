# Type Safety Comprehensive Audit - Hominem Monorepo

## TL;DR

> **Quick Summary**: Eliminate all `any` type annotations across the Hominem monorepo through a systematic 4-phase approach. Fix public API types first (highest ROI), then serializers, tests, and utilities. Enable stricter TS compiler options to prevent regression.
>
> **Deliverables**:
> - Zero `any` types in `/packages/hono-rpc/src/types/`
> - All route serializer functions have typed inputs
> - All test mocks use proper type assertions
> - Stricter TypeScript compiler options enabled
> - All tests pass, typecheck passes, no build regressions
>
> **Estimated Effort**: Medium (40-50 hours)
> **Parallel Execution**: YES - Fix by package (Finance → Places → Events → etc in parallel)
> **Critical Path**: Type definitions → Serializers → Tests

---

## Context

### Original Request
Perform a comprehensive type-audit of the Hominem monorepo and identify highest-impact type safety improvements.

### Analysis Summary
**Scope**: 1,004 TypeScript files across monorepo
**Issues Found**: 132 instances of `any` or `as any` in 4 main categories
**Current State**: Good baseline (`strict: true`, `noImplicitAny: true`), but significant gaps in API contracts and data transformation layers

### Key Decisions Made
- **Approach**: Complete fix in 4 phases (all issue areas, single pass)
- **Type Definition Strategy**: Define proper types (not generic `Record<string, unknown>`)
- **Compiler Options**: Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` after explicit fixes

---

## Work Objectives

### Core Objective
Achieve **production-grade type safety** across the Hominem monorepo by eliminating all `any` type annotations and tightening TypeScript compiler options. This enables confident refactoring, reduces runtime errors, and improves developer experience across all consumers (React apps, CLI tools, MCP servers).

### Concrete Deliverables
- ✅ All fields in `/packages/hono-rpc/src/types/` have proper types (no `any`)
- ✅ All route serializer functions have typed inputs
- ✅ All test mocks use real type assertions (no `as any`)
- ✅ All service/utility functions have proper types
- ✅ `noUncheckedIndexedAccess: true` enabled in tsconfig.base.json
- ✅ `exactOptionalPropertyTypes: true` enabled in tsconfig.base.json
- ✅ `bun run typecheck` passes completely
- ✅ `bun run test` passes (all tests)
- ✅ No build time regression

### Definition of Done
- [ ] All `any` types replaced with proper type definitions
- [ ] All `as any` casts removed from source code
- [ ] Stricter compiler options enabled and no type errors
- [ ] Tests pass and cover the changed code
- [ ] PR review approved
- [ ] Deployed to production without issues

### Must Have
- [ ] Zero breaking changes to public API types (consumers remain compatible)
- [ ] All type changes verified with `bun run typecheck`
- [ ] Test coverage maintains or improves
- [ ] No performance regression from compiler option changes
- [ ] Clear commit history documenting each phase

### Must NOT Have (Guardrails)
- [ ] DO NOT change runtime behavior
- [ ] DO NOT alter database schemas or queries (this is types only)
- [ ] DO NOT skip test validation for any change
- [ ] DO NOT enable TS compiler options that break existing code without fixing
- [ ] DO NOT create "stub" types that hide the real issue
- [ ] DO NOT introduce overly complex generic types

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest in place)
- **User wants tests**: YES (Tests-after approach - run existing tests after each phase)
- **Framework**: Vitest (already configured)

### Verification Approach

**For Type Definition Changes** (no tests—structural only):
```bash
# Agent executes:
1. Edit type definition file
2. Run: bun run typecheck
3. Assert: No new type errors introduced
4. Grep: Verify all consumers of the type still type-check
```

**For Serializer Function Changes**:
```bash
# Agent executes:
1. Add input type to function
2. Update all call sites
3. Run: bun run typecheck
4. Run: bun run test --filter @hominem/hono-rpc
5. Assert: All tests pass
```

**For Test Mock Changes**:
```bash
# Agent executes:
1. Update mock to use proper type assertion
2. Remove `as any`
3. Run: bun run test --filter <package>
4. Assert: Tests pass, mock matches real type
```

**For Compiler Option Changes**:
```bash
# Agent executes:
1. Update tsconfig.base.json
2. Run: bun run typecheck
3. Fix any new type errors that arise
4. Run: bun run test --force
5. Assert: All pass
```

**Automated Verification** (agents execute):
- ✅ `bun run typecheck` passes
- ✅ `bun run test` passes for affected packages
- ✅ Grep confirms no `any` types remain in changed areas
- ✅ Grep confirms `as any` casts removed
- ✅ `bun run build` completes without type errors

---

## Execution Strategy

### Parallel Execution by Domain

```
Wave 1: Compiler Options & Type Definitions (start immediately)
├── Task 1: Enable stricter TS compiler options
└── Task 2: Fix type definitions (independent task, can start in parallel)
    ├── Task 2a: Finance types (highest concentration)
    ├── Task 2b: Places types
    ├── Task 2c: Chat types
    └── Task 2d: Other types (invites, lists, items, notes, twitter, etc.)

Wave 2: Route Serializers (after Wave 1 Task 2 completes)
├── Task 3: Finance route serializers
├── Task 4: Places route serializers
├── Task 5: Events/Chats route serializers
└── Task 6: Other route serializers (invites, lists, items, notes, content, etc.)

Wave 3: Test Mocks (can start after Wave 1)
├── Task 7: Service test mocks
├── Task 8: Component test mocks
└── Task 9: Integration test mocks

Wave 4: Utility/Service Functions (can start any time)
└── Task 10: Utils and service function types

Final: Validation & Cleanup
├── Task 11: Full typecheck and test suite run
└── Task 12: Commit and document
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Compiler options) | None | 2, 3, 4 | - |
| 2a (Finance types) | 1 | 3a | 2b, 2c, 2d, 7 |
| 2b (Places types) | 1 | 4a | 2a, 2c, 2d, 7 |
| 2c (Chat types) | 1 | 5a | 2a, 2b, 2d, 7 |
| 2d (Other types) | 1 | 6a | 2a, 2b, 2c, 7 |
| 3a (Finance serializers) | 2a | 11 | 3b, 4a, 5a, 6a |
| 3b (Finance serializers continued) | 3a | 11 | 3a, 4a, 5a, 6a |
| 4a (Places serializers) | 2b | 11 | 3a, 3b, 5a, 6a |
| 5a (Events/Chats serializers) | 2c | 11 | 3a, 4a, 6a |
| 6a (Other serializers) | 2d | 11 | 3a, 4a, 5a |
| 7 (Service test mocks) | 1 | 11 | 2a, 2b, 2c, 2d, 8, 9 |
| 8 (Component test mocks) | 1 | 11 | 2a, 2b, 2c, 2d, 7, 9 |
| 9 (Integration test mocks) | 1 | 11 | 2a, 2b, 2c, 2d, 7, 8 |
| 10 (Utils/service functions) | 1 | 11 | All (independent) |
| 11 (Full validation) | 3a, 4a, 5a, 6a, 7, 8, 9, 10 | 12 | - |
| 12 (Commit) | 11 | None | - |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents | Parallelization |
|------|-------|-------------------|-----------------|
| 1 | 1, 2a-2d, 7, 8, 9, 10 | **Batch 1A**: Task 1 (quick) + Task 2a-2d (can parallelize) | 1 alone, then 2a-2d in parallel |
| 1 Cont. | 7, 8, 9, 10 | **Batch 1B**: Task 7-10 (independent) | All 4 in parallel |
| 2 | 3a, 4a, 5a, 6a | **Batch 2**: Tasks 3a, 4a, 5a, 6a in parallel | Fully parallel |
| 3 | 3b, etc. | **Batch 3**: Continued serializer fixes | Parallel by route group |
| 4 | 11, 12 | Sequential validation then commit | Linear (validation → commit) |

---

## TODOs

### Phase 1a: Compiler Options (Wave 1)

- [ ] 1. Enable stricter TypeScript compiler options

  **What to do**:
  - Edit `tsconfig.base.json`
  - Add `"noUncheckedIndexedAccess": true`
  - Add `"exactOptionalPropertyTypes": true`
  - Verify changes with `bun run typecheck`
  - Expect: No new errors (code is already well-typed)

  **Must NOT do**:
  - Skip testing the change
  - Enable other options without explicit approval

  **Recommended Agent Profile**:
  > This is a low-complexity configuration change with high verification importance
  - **Category**: `quick`
    - Reason: Single file edit, well-defined scope, minimal risk
  - **Skills**: [`git-master`]
    - `git-master`: Needed for clean commit of configuration change

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (must complete first)
  - **Blocks**: Tasks 2a-2d (will inherit new compiler strictness)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Configuration File References**:
  - `/Users/charlesponti/Developer/hominem/tsconfig.base.json` - Current config to update

  **TypeScript Documentation**:
  - https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess - Docs on noUncheckedIndexedAccess
  - https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes - Docs on exactOptionalPropertyTypes

  **Acceptance Criteria**:

  **Automated Verification (ALWAYS include)**:
  ```bash
  # Agent executes:
  1. Edit: tsconfig.base.json
     - Add: "noUncheckedIndexedAccess": true
     - Add: "exactOptionalPropertyTypes": true
  2. Run: bun run typecheck
  3. Assert: Command exits with status 0 (success)
  4. Assert: No new type errors introduced (output contains no "error TS")
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run typecheck` showing success
  - [ ] Git diff showing exact changes to tsconfig.base.json

  **Commit**: YES
  - Message: `chore(ts): enable noUncheckedIndexedAccess and exactOptionalPropertyTypes`
  - Files: `tsconfig.base.json`
  - Pre-commit: `bun run typecheck`

---

### Phase 1b: Type Definitions (Wave 1, parallel with Task 1)

#### 1b.1: Finance Types

- [ ] 2a. Fix finance type definitions (budget, plaid, accounts, etc.)

  **What to do**:
  - Fix `/packages/hono-rpc/src/types/finance/budget.types.ts`
    - Line 67: `summary?: any` → define as `summary?: BudgetSummary` or `Record<string, unknown>`
    - Create type: `type BudgetSummary = { totalBudgeted: number; totalSpent: number; ... }`
  - Fix `/packages/hono-rpc/src/types/finance/plaid.types.ts`
    - Line 23: `metaData?: any` → define as `metaData?: PlaidMetadata`
    - Create type: `type PlaidMetadata = { institution?: { id: string; name: string }; ... }`
  - Fix `/packages/hono-rpc/src/types/finance/accounts.types.ts`
    - Search for any remaining `any` fields
  - Run `bun run typecheck` after each file
  - Run `bun run test --filter @hominem/finance` to verify consumers

  **Must NOT do**:
  - Use generic `any` as placeholder
  - Break existing consumers (type definitions are public exports)
  - Change return types of routes

  **Recommended Agent Profile**:
  > This is structured type definition work with clear patterns
  - **Category**: `unspecified-high`
    - Reason: Requires analyzing finance domain logic to define correct types
  - **Skills**: []
    - No special skills needed (type definition work)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2b, 2c, 2d, Task 1)
  - **Blocks**: Task 3a (Finance route serializers)
  - **Blocked By**: Task 1 (Compiler options)

  **References**:

  **Type Definition Files**:
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/budget.types.ts` - Budget types with `summary?: any`
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/plaid.types.ts` - Plaid types with `metaData?: any`
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/accounts.types.ts` - Account types
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/shared.types.ts` - Shared finance types

  **Service References** (to understand what types should be):
  - `/Users/charlesponti/Developer/hominem/packages/finance/src/*.service.ts` - Finance services that define actual types
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/finance.*.ts` - Routes that use these types

  **Test References**:
  - `/Users/charlesponti/Developer/hominem/packages/finance/src/` - Finance package tests

  **Consumer References**:
  - `/Users/charlesponti/Developer/hominem/apps/finance/` - Finance app uses these types
  - `/Users/charlesponti/Developer/hominem/services/api/` - API may export these

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. Edit: /packages/hono-rpc/src/types/finance/*.types.ts
     - Replace all `any` fields with proper types
     - Create new types if needed (e.g., type BudgetSummary = {...})
  2. Run: bun run typecheck
  3. Assert: No errors related to finance types
  4. Run: bun run test --filter @hominem/finance
  5. Assert: All finance tests pass
  6. Grep: Verify no remaining `any` in finance type files
     - Command: grep -n ": any\b" /packages/hono-rpc/src/types/finance/*.ts
     - Expected: No matches
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run typecheck` (success)
  - [ ] Terminal output from `bun run test --filter @hominem/finance` (all pass)
  - [ ] Git diff showing type changes

  **Commit**: YES (groups with 2b, 2c, 2d)
  - Message: `feat(types): remove any types from finance type definitions`
  - Files: `packages/hono-rpc/src/types/finance/*.ts`
  - Pre-commit: `bun run typecheck && bun run test --filter @hominem/finance`

---

#### 1b.2: Places Types

- [ ] 2b. Fix places type definitions

  **What to do**:
  - Fix `/packages/hono-rpc/src/types/places.types.ts` (largest type file, 459 lines)
    - Search for `?: any` and `as any` patterns
    - Lines with `place?: any`, `flight?: any` → define as `PlaceItemData` or `FlightItemData`
    - Run `bun run typecheck`
  - Fix any related type exports

  **Must NOT do**:
  - Use generic any
  - Break existing place-related consumers

  **Recommended Agent Profile**:
  > Similar to finance types, structured domain work
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with 2a, 2c, 2d, Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4a (Places route serializers)
  - **Blocked By**: Task 1

  **References**:

  **Type Definition Files**:
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/places.types.ts` - Main places types (459 lines)

  **Service References**:
  - `/Users/charlesponti/Developer/hominem/packages/places/src/` - Places service

  **Route References**:
  - `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/places.ts` - Places routes (20KB, many serializers)

  **Consumer References**:
  - `/Users/charlesponti/Developer/hominem/apps/rocco/` - Main consumer of places types

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. Edit: /packages/hono-rpc/src/types/places.types.ts
     - Replace all `any` fields
  2. Run: bun run typecheck
  3. Assert: No type errors
  4. Run: bun run test --filter @hominem/places
  5. Assert: All tests pass
  6. Grep: grep -n ": any\b" /packages/hono-rpc/src/types/places.types.ts
     - Expected: No matches
  ```

  **Commit**: YES (groups with 2a, 2c, 2d)
  - Message: `feat(types): remove any types from places type definitions`
  - Files: `packages/hono-rpc/src/types/places.types.ts`
  - Pre-commit: `bun run typecheck && bun run test --filter @hominem/places`

---

#### 1b.3: Chat Types

- [ ] 2c. Fix chat type definitions

  **What to do**:
  - Fix `/packages/hono-rpc/src/types/chat.types.ts` (136 lines)
    - Line 12: `result?: any` → define as `ToolResult` or proper shape
    - Line 22: `files: any | null` → define as `ChatFiles | null`
    - Create new types as needed

  **References**:

  **Type Definition Files**:
  - `/packages/hono-rpc/src/types/chat.types.ts`

  **Service References**:
  - `/packages/chat/src/service/`

  **Route References**:
  - `/packages/hono-rpc/src/routes/chats.ts`

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. Edit: /packages/hono-rpc/src/types/chat.types.ts
  2. Run: bun run typecheck
  3. Assert: No errors
  4. Run: bun run test --filter @hominem/chat
  5. Assert: All pass
  6. Grep: grep -n ": any\b" /packages/hono-rpc/src/types/chat.types.ts
     - Expected: No matches
  ```

  **Commit**: YES (groups with 2a, 2b, 2d)
  - Message: `feat(types): remove any types from chat type definitions`
  - Files: `packages/hono-rpc/src/types/chat.types.ts`
  - Pre-commit: `bun run typecheck && bun run test --filter @hominem/chat`

---

#### 1b.4: Other Type Definitions

- [ ] 2d. Fix remaining type definitions (invites, lists, items, notes, twitter, etc.)

  **What to do**:
  - Fix `/packages/hono-rpc/src/types/invites.types.ts`
  - Fix `/packages/hono-rpc/src/types/lists.types.ts` (158 lines, has `places?: any[]`, `items?: any[]`)
  - Fix `/packages/hono-rpc/src/types/items.types.ts` (65 lines, has `place?: any`, `flight?: any`)
  - Fix `/packages/hono-rpc/src/types/notes.types.ts` (118 lines, has `analysis?: any | null`)
  - Fix `/packages/hono-rpc/src/types/twitter.types.ts` (69 lines, has `content: any | null`)
  - Search for any remaining `any` fields in other type files

  **References**:

  **Type Definition Files**:
  - `/packages/hono-rpc/src/types/invites.types.ts`
  - `/packages/hono-rpc/src/types/lists.types.ts`
  - `/packages/hono-rpc/src/types/items.types.ts`
  - `/packages/hono-rpc/src/types/notes.types.ts`
  - `/packages/hono-rpc/src/types/twitter.types.ts`
  - Any other type files in `/packages/hono-rpc/src/types/`

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. For each type file:
     a. Edit: /packages/hono-rpc/src/types/{name}.types.ts
     b. Replace all `any` fields
  2. Run: bun run typecheck
  3. Assert: No errors
  4. Grep: grep -n ": any\b" /packages/hono-rpc/src/types/*.ts
     - Expected: No matches (except in comments)
  ```

  **Commit**: YES (groups with 2a, 2b, 2c)
  - Message: `feat(types): remove any types from all remaining type definitions`
  - Files: `packages/hono-rpc/src/types/*.types.ts`
  - Pre-commit: `bun run typecheck`

---

### Phase 2: Route Serializers (Wave 2, after Phase 1b complete)

- [ ] 3. Fix route serializer function types (finance, places, events, chats, etc.)

  **What to do**:
  - For each route file in `/packages/hono-rpc/src/routes/`:
    - Extract DB types (either from service imports or create types)
    - Replace `function serializeX(input: any): ReturnType` with `function serializeX(input: DBType): ReturnType`
    - Update all call sites to pass typed inputs
    - Example: `function serializeBudgetCategory(cat: BudgetCategory): BudgetCategoryData`
  - Focus on these files (in order of impact):
    1. `places.ts` (20KB, 20+ serializers)
    2. `finance.budget.ts` (12KB, 8+ serializers)
    3. `twitter.ts` (11KB, multiple serializers)
    4. `finance.accounts.ts` (7.3KB)
    5. Other route files (5-6KB each)
  - Run `bun run typecheck` after each major change
  - Run `bun run test` for affected routes

  **Must NOT do**:
  - Change serialization logic (types only)
  - Break return types
  - Skip testing route changes

  **Recommended Agent Profile**:
  > Systematic refactoring of serializer functions across many files
  - **Category**: `unspecified-high`
    - Reason: Requires understanding data flow and updating multiple related functions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (by route file/domain)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11 (Full validation)
  - **Blocked By**: Tasks 2a-2d (Type definitions)

  **References**:

  **Route Files** (by size/impact):
  - `/packages/hono-rpc/src/routes/places.ts:65-620` - Serializer functions for places
  - `/packages/hono-rpc/src/routes/finance.budget.ts:45-52` - Serializer for budget categories
  - `/packages/hono-rpc/src/routes/twitter.ts` - Twitter-related serializers
  - `/packages/hono-rpc/src/routes/finance.accounts.ts:41, 60` - Account serializers
  - `/packages/hono-rpc/src/routes/chats.ts:43, 53` - Chat serializers
  - `/packages/hono-rpc/src/routes/events.ts:36` - Event serializers
  - `/packages/hono-rpc/src/routes/notes.ts:27` - Note serializers

  **Database/Service Types**:
  - Check service files for actual DB return types
  - May need to import from services or create explicit types

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes (for each route file):
  1. Edit: /packages/hono-rpc/src/routes/{route}.ts
     - Add input types to serialize functions
     - Update function signatures
  2. Run: bun run typecheck
  3. Assert: No errors
  4. Run: bun run test
  5. Assert: Tests pass for affected routes
  6. Grep: grep -n "any\)" /packages/hono-rpc/src/routes/{route}.ts
     - Expected: No matches in serialize function signatures
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run typecheck` (success)
  - [ ] Terminal output from `bun run test` (all pass)
  - [ ] Git diff showing serializer type changes

  **Commit**: YES (one per major route group)
  - Message: `feat(routes): type serializer functions in {domain} routes`
  - Files: `packages/hono-rpc/src/routes/{finance,places,events,chats,etc}.ts`
  - Pre-commit: `bun run typecheck && bun run test`

---

### Phase 3: Test Mocks (Wave 1, parallel, can start with Phase 1a)

- [ ] 4. Fix test mocks with proper types

  **What to do**:
  - Search for `as any` in test files:
    - `/services/api/test/utils.ts` - API test utilities
    - `/packages/services/src/*.service.test.ts` - Service test mocks
    - `/apps/rocco/app/test/roccoMocker.ts` - Component test mocks
    - `/packages/db/src/test/utils.ts` - Database test utilities
  - For each `as any` cast:
    - Determine what type should be used
    - Replace `mockReturnValue(result as any)` with proper type assertion
    - Example: `mockReturnValue(result as DBBudgetCategory)` or create factory function
  - Run tests to ensure mocks still work

  **Must NOT do**:
  - Skip test validation
  - Hide type errors with new casts

  **Recommended Agent Profile**:
  > Test infrastructure refactoring, systematic casting removal
  - **Category**: `unspecified-medium`
    - Reason: Many small changes across test files, need to ensure tests still pass
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Phase 1a and 1b)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11 (Full validation)
  - **Blocked By**: Task 1 (Compiler options)

  **References**:

  **Test Utility Files**:
  - `/services/api/test/utils.ts:24` - Context mock with `as any`
  - `/services/api/test/api-test-utils.d.ts:9-10` - Rate limit mock types
  - `/packages/services/src/google-calendar.service.test.ts` - Service mocks
  - `/apps/rocco/app/test/roccoMocker.ts` - React component mocks
  - `/packages/db/src/test/utils.ts` - Database test utilities

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. For each test file with `as any`:
     a. Edit: test file
     b. Replace `as any` with proper type assertion
     c. Run: bun run test --filter <package>
     d. Assert: Tests pass
  2. Grep: grep -rn "as any" services/api/test packages/services/src apps/rocco/app/test packages/db/src/test
     - Expected: No matches (except in comments)
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run test` (all pass)
  - [ ] Git diff showing test type changes

  **Commit**: YES (can group by package)
  - Message: `refactor(tests): remove as any casts from test mocks`
  - Files: `services/api/test/`, `packages/services/src/*.test.ts`, `apps/rocco/app/test/`, etc.
  - Pre-commit: `bun run test`

---

### Phase 4: Utility/Service Functions (Wave 1, parallel)

- [ ] 5. Fix utility and service function types

  **What to do**:
  - Search for `any` in non-route files:
    - `/packages/services/src/*.service.ts` - Service definitions
    - `/packages/utils/src/` - Utility functions
    - `/packages/hono-rpc/src/middleware/` - Middleware
  - For each `any` type:
    - Define proper type (e.g., from remark AST, or extract shape)
    - Replace loose type with specific type
    - Example: `metadata: any` → `metadata: VectorMetadata`
  - Run typecheck and related tests

  **Must NOT do**:
  - Use overly complex types
  - Hide the intent

  **Recommended Agent Profile**:
  > Utility and service layer type improvements
  - **Category**: `unspecified-medium`
    - Reason: Scattered changes across packages, need verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of other phases)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11 (Full validation)
  - **Blocked By**: Task 1

  **References**:

  **Utility Files**:
  - `/packages/utils/src/markdown/markdown-processor.ts:59` - AST node typing
  - `/packages/utils/src/data/normalization.ts:30` - Object normalization
  - `/packages/services/src/vector.service.ts:172, 237` - Vector service metadata

  **Middleware Files**:
  - `/packages/hono-rpc/src/middleware/error.ts:58` - Error type casting

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. Edit: utility and service files
     - Replace all `any` types with proper types
  2. Run: bun run typecheck
  3. Assert: No errors
  4. Run: bun run test
  5. Assert: All tests pass
  6. Grep: grep -rn ": any\b\|as any" packages/utils packages/services --include="*.ts" ! -path "*test*"
     - Expected: No matches
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run typecheck` (success)
  - [ ] Terminal output from `bun run test` (all pass)

  **Commit**: YES
  - Message: `refactor(utils): remove any types from utility and service functions`
  - Files: `packages/utils/src/`, `packages/services/src/`, `packages/hono-rpc/src/middleware/`
  - Pre-commit: `bun run typecheck && bun run test`

---

### Phase 5: Validation & Cleanup

- [ ] 6. Full typecheck and test validation

  **What to do**:
  - Run comprehensive type and test suite
  - Verify no regressions
  - Document final status

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  1. Run: bun run typecheck
  2. Assert: Output contains no errors, only success message
  3. Run: bun run test --force
  4. Assert: All tests pass
  5. Run: bun run build
  6. Assert: Build succeeds
  7. Grep: grep -rn ": any\b\|as any" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" ! -path "*/build/*"
  8. Assert: No matches (or expected allowances for comments only)
  ```

  **Evidence to Capture**:
  - [ ] Full `bun run typecheck` output
  - [ ] Full `bun run test` output
  - [ ] Build success logs

  **Commit**: YES
  - Message: `chore(audit): complete type safety audit, zero any types`
  - Files: All changed files (summarized)
  - Pre-commit: `bun run typecheck && bun run test && bun run build`

---

## Commit Strategy

| Phase | Message | Files | Verification |
|-------|---------|-------|--------------|
| 1a | `chore(ts): enable noUncheckedIndexedAccess and exactOptionalPropertyTypes` | `tsconfig.base.json` | `bun run typecheck` |
| 1b | `feat(types): remove any types from finance type definitions` | `packages/hono-rpc/src/types/finance/*.ts` | `bun run typecheck && bun run test --filter @hominem/finance` |
| 1b | `feat(types): remove any types from places type definitions` | `packages/hono-rpc/src/types/places.types.ts` | `bun run typecheck && bun run test --filter @hominem/places` |
| 1b | `feat(types): remove any types from chat type definitions` | `packages/hono-rpc/src/types/chat.types.ts` | `bun run typecheck && bun run test --filter @hominem/chat` |
| 1b | `feat(types): remove any types from all remaining type definitions` | `packages/hono-rpc/src/types/*.types.ts` | `bun run typecheck` |
| 2 | `feat(routes): type serializer functions in {domain} routes` | `packages/hono-rpc/src/routes/{finance,places,etc}.ts` | `bun run typecheck && bun run test` |
| 3 | `refactor(tests): remove as any casts from test mocks` | Test files across packages | `bun run test` |
| 4 | `refactor(utils): remove any types from utility and service functions` | `packages/utils/src/`, `packages/services/src/` | `bun run typecheck && bun run test` |
| Final | `chore(audit): complete type safety audit, zero any types` | Summary of all changes | `bun run typecheck && bun run test && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
# Type checking - must pass
bun run typecheck

# All tests - must pass
bun run test --force

# Build - must complete without errors
bun run build

# No any types remaining
grep -rn ": any\b\|as any" . --include="*.ts" --include="*.tsx" \
  ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" ! -path "*/build/*" \
  | grep -v "// " | grep -v "node_modules"
# Expected: Empty output (no matches)
```

### Final Checklist
- [ ] All `any` types replaced with proper definitions
- [ ] Compiler options enabled with no breaking changes
- [ ] `bun run typecheck` passes
- [ ] `bun run test --force` passes (all tests)
- [ ] `bun run build` completes successfully
- [ ] No performance regression
- [ ] All commits follow the strategy above
- [ ] Documentation updated (if needed)

---

## Success Indicators

✅ **Immediate Impact**:
- Type safety improves across all consumer packages
- IDE autocomplete becomes more precise
- Refactoring becomes safer and faster

✅ **Developer Experience**:
- Type errors caught at compile time, not runtime
- Clear intent in code (types document behavior)
- Fewer surprises during development

✅ **Codebase Quality**:
- Easier onboarding (types as documentation)
- Reduced bugs from type mismatches
- Confidence in database schema changes

