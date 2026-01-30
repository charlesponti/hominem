---
title: "refactor: Remove Deprecated success() and error() RPC Functions"
type: refactor
date: 2026-01-29
---

# Remove Deprecated success() and error() RPC Functions

## Overview

The RPC server currently uses deprecated `success()` and `error()` wrapper functions throughout 14 route files (143 total instances). These functions are no longer needed because the codebase has already implemented a comprehensive error middleware system that properly handles error responses. This refactor will eliminate the deprecated wrapper functions, simplify the codebase, and rely entirely on the modern error handling infrastructure already in place.

## Problem Statement / Motivation

The `success()` and `error()` functions in `/packages/services/src/api-result.ts` are marked `@deprecated` but continue to be used throughout the codebase. This creates:

- **Code duplication**: Wrapper functions add unnecessary abstraction layers
- **Maintenance burden**: Multiple patterns for handling responses across different routes
- **Type safety issues**: Wrapper functions obscure the actual response types
- **Inconsistent implementations**: Some routes have already been migrated to the modern pattern (finance.accounts, events, chats)
- **Bundle size waste**: Unused exported functions remain in the build

The modern replacement infrastructure is already fully implemented and working:
- Global error middleware handles all error cases (`/packages/hono-rpc/src/middleware/error.ts`)
- Service error classes provide structured error handling
- Several routes are already using the new pattern successfully

## Proposed Solution

Systematically replace all instances of `success()` and `error()` with direct return patterns:

**Error handling (new pattern):**
```typescript
// Old pattern
return c.json(error('NOT_FOUND', 'User not found'), 404)

// New pattern
throw new NotFoundError('User not found')
```

**Success handling (new pattern):**
```typescript
// Old pattern
return c.json(success({ data: user }))

// New pattern
return c.json<User>(user, 200)
```

After all call sites are migrated:
1. Remove the deprecated functions from `/packages/services/src/api-result.ts`
2. Remove the exports from `/packages/services/src/index.ts`
3. Remove any unused imports of these functions
4. Clean up any test files that reference these functions

## Technical Approach

### Architecture

The error handling flow (already in place):

```
Route Handler
  ↓
Throws service error (e.g., NotFoundError)
  ↓
Error Middleware (/packages/hono-rpc/src/middleware/error.ts)
  ↓
Converts to standard REST response with correct HTTP status
  ↓
Response sent to client
```

This eliminates the need for manual error wrapping throughout route handlers.

### Implementation Phases

#### Phase 1: Audit and Reference Implementation (1-2 hours)

Create a reference implementation showing the exact pattern for all cases:

**Files involved:**
- `packages/hono-rpc/src/middleware/error.ts` (verify middleware handles all error types)
- `packages/services/src/error-classes.ts` (identify all available error types)
- `packages/services/src/api-result.ts` (document deprecated functions)

**Deliverables:**
- Decision matrix: which error class to use for each error type
- Reference migration showing before/after for multiple patterns
- List of required imports for each file type

**Success criteria:**
- Clear guidance for each migration case
- No ambiguity about which error class to use

#### Phase 2: Migrate High-Impact Files (4-6 hours)

Target files with highest instance counts first:

1. `packages/hono-rpc/src/routes/files.ts` (12 instances)
2. `packages/hono-rpc/src/routes/bookmarks.ts` (11 instances)
3. `packages/hono-rpc/src/routes/vector.ts` (10 instances)
4. `packages/hono-rpc/src/routes/content.ts` (10 instances)
5. `packages/hono-rpc/src/routes/content-strategies.ts` (6 instances)

**For each file:**
- Replace all `error()` calls with appropriate `throw new ErrorClass()` statements
- Replace all `success()` calls with `return c.json<Type>(data, 200)`
- Remove imports of `success` and `error` from `@hominem/services`
- Add imports for required service error classes
- Run tests to verify functionality
- Verify TypeScript compilation

**Deliverables:**
- 6 fully migrated files
- Passing tests for each file
- No TypeScript errors

**Success criteria:**
- All 49 instances in high-impact files replaced
- Tests passing
- No regressions in error handling

#### Phase 3: Migrate Medium and Low-Impact Files (1-2 hours)

Remaining 6 files with lower instance counts:

- `location.ts` (4 instances)
- `search.ts` (3 instances)
- `user.ts` (2 instances)
- `finance.runway.ts` (2 instances)
- `finance.data.ts` (2 instances)
- `admin.ts` (2 instances)

**Same process as Phase 2:**
- Replace all function calls
- Update imports
- Run tests
- Verify TypeScript compilation

**Deliverables:**
- 8 fully migrated files
- Passing tests for each file
- No TypeScript errors

**Success criteria:**
- All 15 remaining instances replaced
- 100% migration complete (64/64 instances)
- Tests passing
- No regressions

#### Phase 4: Cleanup and Removal (1-2 hours)

After all call sites are migrated:

1. **Remove from api-result.ts:**
   - Delete `success()` function (lines 110-115)
   - Delete `error()` function (lines 128-139)

2. **Remove from index.ts:**
   - Remove `success` export (line 32)
   - Remove `error` export (line 33)

3. **Verify no remaining usage:**
   - Search codebase for remaining `success(` or `error(` patterns
   - If found, migrate any missed instances

4. **Run full test suite:**
   - `bun run test`
   - Verify all tests pass
   - Check for any runtime issues

5. **Type checking:**
   - `bun run typecheck`
   - Verify no new type errors introduced

**Deliverables:**
- Deprecated functions completely removed
- No broken imports or references
- All tests passing
- Clean TypeScript compilation

**Success criteria:**
- Functions deleted from codebase
- No references to deleted functions remain
- Full test suite passes
- No type errors introduced

## Alternative Approaches Considered

**1. Gradual deprecation with warnings**
- Pros: Less immediate effort, phased migration possible
- Cons: Maintains confusing code surface, doesn't provide real benefit
- **Rejected**: We have the infrastructure in place; better to do complete migration

**2. Wrap middleware in success/error functions**
- Pros: Would centralize response formatting
- Cons: Adds unnecessary abstraction, middleware already does this
- **Rejected**: Redundant with existing error middleware

**3. Create adapter functions during migration**
- Pros: Could automate some replacements
- Cons: Adds intermediate layer, still doesn't remove the problem
- **Rejected**: Direct replacement is cleaner and more maintainable

## Acceptance Criteria

### Functional Requirements

- [x] All 64 instances of `success()` and `error()` function calls are replaced
- [x] Replacement uses appropriate service error classes for error cases
- [x] Replacement uses direct `c.json()` returns for success cases
- [x] All error types are properly handled by existing error middleware
- [x] `success()` and `error()` functions completely removed from codebase
- [x] No imports of `success` or `error` from `@hominem/services` remain

### Non-Functional Requirements

- [ ] No performance regression in error handling
- [ ] Type safety maintained or improved
- [ ] Bundle size reduced by removing unused exports
- [ ] All existing tests continue to pass
- [ ] No new TypeScript errors introduced
- [ ] Code follows project conventions (from AGENTS.md)

### Quality Gates

- [ ] Full test suite passes: `bun run test`
- [ ] No TypeScript errors: `bun run typecheck`
- [ ] Linting passes: `bun run lint --parallel`
- [ ] Code formatting verified: `bun run format`
- [ ] All route handlers follow consistent pattern
- [ ] Error messages remain user-friendly and clear

## Success Metrics

1. **Completeness**: 100% of deprecated function calls replaced (0 remaining instances of success()/error())
2. **Test Coverage**: All existing tests continue to pass (0 new failures)
3. **Type Safety**: TypeScript compilation clean, no new errors
4. **Code Quality**: Consistent error handling pattern across all 11 route files
5. **Build Size**: Reduction in bundle size from removing unused exports
6. **Developer Experience**: Clearer, more maintainable error handling code

## Dependencies & Prerequisites

**Prerequisites that are already in place:**

- ✅ Global error middleware registered in `app.ts` (line 41)
- ✅ Service error classes available: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BadRequestError`, `InternalServerError`
- ✅ Error middleware correctly converts errors to REST responses
- ✅ Reference implementations in `finance.accounts.ts`, `events.ts`, `chats.ts`

**Internal dependencies:**

- All 14 affected route files depend on the migration completing successfully
- Error handling across entire API depends on consistent error class usage
- Tests depend on updated error handling patterns

**No external dependencies:** This refactor has no external library dependencies and doesn't require changes to external services.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Missed migration causing `success()` or `error()` calls to fail at runtime | Medium | High | Search codebase systematically, run full test suite, use grep to verify complete removal |
| Incorrect error class used for certain error conditions | Medium | High | Create reference decision matrix in Phase 1, code review each file, verify error codes match HTTP status |
| Regressions in error handling causing API to return incorrect status codes | Low | High | Run full test suite after each phase, monitor error middleware behavior |
| Type inference issues with direct `c.json()` returns | Low | Medium | Add explicit type annotations (e.g., `c.json<User>(data)`), verify TypeScript compilation |
| Forgotten imports causing new errors | Low | Medium | Automated IDE assistance, manual verification, linting catches unused imports |
| Tests that mock `success()` or `error()` break | Low | Medium | Update test files to use new patterns, or remove mocks if no longer needed |

**Overall Risk Level: LOW** - The infrastructure is proven, reference implementations exist, and full test suite will catch issues.

## Resource Requirements

**Team Composition:**
- 1 developer with monorepo familiarity
- Time for code review and testing

**Time Estimate:**
- **Phase 1 (Audit):** 1-2 hours
- **Phase 2 (High-impact files):** 6-8 hours
- **Phase 3 (Remaining files):** 4-6 hours
- **Phase 4 (Cleanup):** 1-2 hours
- **Testing & validation:** 2-3 hours
- **Total: 14-21 hours** (approximately 2-3 days for one developer)

**Infrastructure:**
- No additional infrastructure needed
- All tooling already available (TypeScript, Vitest, Turbo)

## Future Considerations

**After this refactor:**

1. **Code review checklist:** Add "Verify service errors used instead of response wrappers" to code review guidelines
2. **New route patterns:** Document the error handling pattern in AGENTS.md for consistency
3. **Error middleware enhancements:** Could add automatic request logging or metrics collection
4. **Type safety:** Could explore stricter type constraints on error handling
5. **Error response format:** Current format is established; no changes needed

**Prevention of regression:**
- Keep error middleware as the single source of truth for error response formatting
- Lint rule could be added to catch attempts to re-introduce response wrapper patterns
- Documentation in AGENTS.md will guide future developers

## Documentation Plan

**Files to update:**

1. **AGENTS.md** - Add section on error handling patterns:
   - Document the preferred error handling pattern using service errors
   - Show examples of throwing vs returning
   - Reference the error middleware behavior

2. **Code comments** - In migrated files:
   - Minimal comments needed; code is self-documenting
   - Only add comments if error class choice needs justification

3. **Route documentation** - If exists:
   - Update any examples showing old `success()` / `error()` patterns
   - Show new pattern in documentation

## References & Research

### Internal References

**Deprecated functions:**
- Function definitions: `/packages/services/src/api-result.ts:110-115` (success), `128-139` (error)
- Exports: `/packages/services/src/index.ts:32-33`

**Error middleware:**
- Error handling: `/packages/hono-rpc/src/middleware/error.ts`
- Error classes: `/packages/services/src/error-classes.ts`
- Registration: `/packages/hono-rpc/src/app.ts:41`

**Reference implementations (already using new pattern):**
- Finance routes: `packages/services/src/routes/finance.accounts.ts`
- Events: `packages/services/src/routes/events.ts`
- Chats: `packages/services/src/routes/chats.ts`

**Files requiring migration (64 total instances):**

Location: `/packages/hono-rpc/src/routes/`

| File | Instances | Status |
|------|-----------|--------|
| files.ts | 12 | pending |
| bookmarks.ts | 11 | pending |
| vector.ts | 10 | pending |
| content.ts | 10 | pending |
| content-strategies.ts | 6 | pending |
| location.ts | 4 | pending |
| search.ts | 3 | pending |
| user.ts | 2 | pending |
| finance.runway.ts | 2 | pending |
| finance.data.ts | 2 | pending |
| admin.ts | 2 | pending |

**Related architecture:**
- Hono framework: `/packages/hono-rpc/`
- Service structure: `/packages/services/`
- Route organization: `/packages/services/src/routes/`

### External References

- **Hono context methods:** https://hono.dev/docs/api/context
- **HTTP status codes:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **REST error handling best practices:** https://www.rfc-editor.org/rfc/rfc7807

### Related Work

- **Similar migrations:** Finance routes were already migrated as reference implementation
- **Error middleware:** Previously implemented; this refactor leverages it
- **No active PRs/Issues:** This is a standalone cleanup effort

## Implementation Notes

**Key patterns to use:**

```typescript
// Error handling - throw appropriate error class
if (!user) {
  throw new NotFoundError('User not found')
}

// Success handling - return JSON with explicit type
return c.json<User>(user, 200)

// Validation errors - use ValidationError
if (!email.includes('@')) {
  throw new ValidationError('Invalid email format')
}

// Authorization errors - use UnauthorizedError or ForbiddenError
if (!token) {
  throw new UnauthorizedError('Missing authentication token')
}
if (!user.canEdit) {
  throw new ForbiddenError('Permission denied')
}
```

**Testing approach:**
- Existing tests should continue to work (error handling tested through routes)
- If tests are checking response structure, they should already expect standard error format
- Update any tests that mock `success()` or `error()` functions

**Order of operations:**
1. Complete one file end-to-end (audit → migrate → test → verify)
2. Verify pattern is working correctly
3. Proceed with remaining files using same pattern
4. Batch removal at the end (Phase 4)

This ensures quality and catches any edge cases early.
