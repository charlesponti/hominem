# TypeScript Performance Issues Report

**Generated**: 2026-01-22

## Executive Summary

After analyzing your monorepo, I found **10 critical areas** where TypeScript type-checking performance could be impacted. The good news: you're already using best practices in many areas (router splitting, type-perf tests). This report identifies opportunities for further optimization.

### Quick Stats

- **Packages Analyzed**: 16
- **Critical Issues**: 1
- **High-Priority Issues**: 5
- **Medium-Priority Issues**: 4
- **Memory Usage (TRPC Package)**: ~1GB during type-checking
- **Type-Check Time (TRPC)**: ~7 seconds

---

## Top 10 Performance Issues

### 🔴 CRITICAL: Issue #1 - TRPC Test Utils Declaration File

**File**: `packages/trpc/src/test/trpc-test-utils.d.ts`
**Impact**: Extremely slow IDE responsiveness, long type-checking times

**Problem**: Massive deeply nested generic type inference with 15+ levels of nesting. The auto-generated `.d.ts` file contains deeply nested `TRPCBuiltRouter` types wrapping 17 different routers.

**Example**:

```typescript
import("@trpc/server").TRPCBuiltRouter<{
  user: {...},
  vector: {...},
  twitter: {...},
  // ...17 routers total
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{...}>>
```

**Recommended Fix**:

1. Add `.d.ts` files to `.gitignore` if they're auto-generated
2. Use `skipLibCheck: true` in tsconfig during development
3. Consider manually writing simpler type exports for test utilities

**Priority**: 🔴 Critical

---

### 🟠 HIGH: Issue #2 - App Router Type Exports

**File**: `packages/trpc/src/index.ts:6-10`
**Impact**: Slow compilation when used in components

**Problem**: `inferRouterInputs<AppRouter>` and `inferRouterOutputs<AppRouter>` infer types across all 17 routers simultaneously.

**Current Code**:

```typescript
export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
```

**Good News**: You've already implemented smart splitting:

```typescript
export type FinanceRouterInputs = inferRouterInputs<typeof financeRouter>;
export type NotesRouterInputs = inferRouterInputs<typeof notesRouter>;
export type ChatsRouterInputs = inferRouterInputs<typeof chatsRouter>;
```

**Recommended Action**: Document in your codebase that developers should use the split types instead of `AppRouterInputs` in components.

**Priority**: 🟠 High (but mitigated)

---

### 🟠 HIGH: Issue #3 - Finance Transactions Router Complex Unions

**File**: `packages/trpc/src/routers/finance/finance.transactions.ts:28-32`
**Impact**: Complex type inference for sort parameters

**Problem**: Union of single enum and array of enums creates expensive discriminated union types.

**Current Code**:

```typescript
sortDirection: z
  .union([z.enum(['asc', 'desc']), z.array(z.enum(['asc', 'desc']))])
  .optional()
  .describe('Sort direction(s)'),
```

**Recommended Fix**:

```typescript
// Option 1: Always use array (simpler type)
sortDirection: z.array(z.enum(['asc', 'desc'])).optional(),

// Option 2: Separate fields
sortDirection: z.enum(['asc', 'desc']).optional(),
sortDirections: z.array(z.enum(['asc', 'desc'])).optional(),
```

**Priority**: 🟠 High

---

### 🟠 HIGH: Issue #4 - Content Strategy Deep Nesting

**File**: `packages/db/src/schema/content.schema.ts`
**Impact**: Expensive schema inference, slow autocomplete

**Problem**: Deeply nested Zod schema with 6+ levels of nesting.

**Current Structure**:

```typescript
contentPlan: z.object({
  blog: z.object({
    outline: z.array(z.object({
      section: z.string(),
      keyPoints: z.array(z.string()),
    })),
    seoKeywords: z.array(z.string()),
    targetAudience: z.array(z.string()),
  }),
  socialMedia: z.array(z.object({...})),
  visualContent: z.object({...})
})
```

**Recommended Fix**:

```typescript
// Extract nested schemas
const BlogOutlineItemSchema = z.object({
  section: z.string(),
  keyPoints: z.array(z.string()),
});

const BlogContentPlanSchema = z.object({
  outline: z.array(BlogOutlineItemSchema),
  seoKeywords: z.array(z.string()),
  targetAudience: z.array(z.string()),
});

const SocialMediaPostSchema = z.object({...});
const VisualContentPlanSchema = z.object({...});

// Main schema - much flatter
const ContentPlanSchema = z.object({
  blog: BlogContentPlanSchema,
  socialMedia: z.array(SocialMediaPostSchema),
  visualContent: VisualContentPlanSchema,
});
```

**Priority**: 🟠 High

---

### 🟠 HIGH: Issue #5 - Finance Schema Relations

**File**: `packages/db/src/schema/finance.schema.ts:180-246`
**Impact**: Slow Drizzle ORM type inference

**Problem**: Multiple complex relation definitions with many cross-references.

**Current Relations**:

- `financialInstitutionRelations`: 2 relations
- `plaidItemRelations`: 3 relations
- `financeAccountRelations`: 4 relations
- `transactionRelations`: 5 relations (references `accounts` table 3 times!)
- `budgetCategoryRelations`: 2 relations

**Recommended Fix**:

```typescript
// Instead of defining all relations, only define the most commonly queried ones
export const transactionRelations = relations(transactions, ({ one }) => ({
  // Keep only the most important relations
  account: one(financeAccounts, {
    fields: [transactions.accountId],
    references: [financeAccounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  // For fromAccount, toAccount, category: use manual joins in queries instead
}));

// Export explicit query result types
export type TransactionWithAccount = typeof transactions.$inferSelect & {
  account: typeof financeAccounts.$inferSelect;
};
```

**Priority**: 🟠 High

---

### 🟡 MEDIUM: Issue #6 - Notes Schema JSON Metadata

**File**: `packages/db/src/schema/notes.schema.ts`
**Impact**: Moderate type inference cost

**Problem**: Multiple complex JSON type schemas combined with `$type<T>()`.

**Current Code**:

```typescript
metadata: jsonb('metadata').$type<NoteMetadata>(),
taskMetadata: jsonb('task_metadata').$type<TaskMetadata>(),
tweetMetadata: jsonb('tweet_metadata').$type<TweetMetadata>(),
```

**Recommended Fix**: Extract the schemas to separate files to reduce co-location complexity.

**Priority**: 🟡 Medium

---

### 🟡 MEDIUM: Issue #7 - Calendar Events Enum Inflation

**File**: `packages/db/src/schema/calendar.schema.ts`
**Impact**: Enum type multiplication

**Problem**: Large enum (12 event types) combined with multiple relations.

**Current Code**:

```typescript
export const eventTypeEnum = pgEnum('event_type', [
  'meeting',
  'task',
  'deadline',
  'reminder',
  'birthday',
  'anniversary',
  'holiday',
  'vacation',
  'appointment',
  'class',
  'workout',
  'other',
]);
```

**Recommended Action**: This is acceptable (12 values). Monitor if it grows beyond 15.

**Priority**: 🟡 Medium (monitor only)

---

### 🟡 MEDIUM: Issue #8 - Chat Message Discriminated Unions

**File**: `packages/db/src/schema/chats.schema.ts`
**Impact**: Moderate JSON type casting overhead

**Problem**: Discriminated unions with `Record<string, unknown>` fallback.

**Recommended Action**: Current implementation is reasonable. No immediate action needed.

**Priority**: 🟡 Medium (acceptable)

---

### 🟡 MEDIUM: Issue #9 - Shared Schema Content Type Unions

**File**: `packages/db/src/schema/shared.schema.ts`
**Impact**: Union type growth from schema composition

**Current Code**:

```typescript
export const AllContentTypeSchema = z.union([
  ...BaseContentTypeSchema.options,
  ...PublishingContentTypeSchema.options,
]);
```

**Recommended Action**: Good use of union composition. No immediate action needed.

**Priority**: 🟡 Medium (acceptable)

---

### 🟡 MEDIUM: Issue #10 - List Relations Join Tables

**File**: `packages/db/src/schema/lists.schema.ts`
**Impact**: Moderate relation graph complexity

**Current Relations**: 5 different table relations with named relations for disambiguation.

**Recommended Action**: Current implementation is reasonable for the use case.

**Priority**: 🟡 Medium (acceptable)

---

## Performance Metrics

### Package-Level Analysis

#### TRPC Package (`packages/trpc`)

- **Files**: 3,333
- **Lines of TypeScript**: 20,309
- **Memory Usage**: ~1 GB
- **Type-Check Time**: 6.96s
- **Status**: ⚠️ High memory usage, consider optimization

#### DB Package (`packages/db`)

- **Files**: 707
- **Lines of TypeScript**: 3,744
- **Memory Usage**: ~96 MB
- **Type-Check Time**: 0.67s
- **Status**: ✅ Performing well

---

## Recommended Action Plan

### Immediate Actions (This Week)

1. ✅ **Add type performance tests** - Already done for finance transactions!
2. 🔴 **Fix Critical Issue #1**: Handle `.d.ts` declaration file
3. 🟠 **Document router splitting**: Add comments directing developers to use split types

### Short-Term Actions (This Month)

4. 🟠 **Fix Issue #3**: Simplify finance transactions sort union
5. 🟠 **Fix Issue #4**: Extract content strategy nested schemas
6. 🟠 **Fix Issue #5**: Reduce finance schema relations
7. 📊 **Run baseline tests**: `bun run test:type-perf` to establish performance baselines

### Long-Term Actions (This Quarter)

8. 📈 **Monitor in CI**: Type perf tests are already in CI workflow
9. 🔍 **Monthly reviews**: Run `bun run analyze:type-perf` monthly
10. 📚 **Team training**: Share `QUICK_START_TYPE_PERFORMANCE.md` with team

---

## Best Practices You're Already Following ✅

1. **Router Splitting**: Excellent implementation of per-feature router type exports
2. **Type Performance Tests**: Already have tests for finance transactions router
3. **CI Integration**: Type perf tests already in GitHub Actions workflow
4. **Explicit Type Exports**: Good use of `TransactionListOutput` and `TransactionDeleteOutput`
5. **Project Structure**: Well-organized monorepo with clear package boundaries

---

## Tools Available

### Quick Commands

```bash
# Find issues
bun run analyze:type-perf

# Run tests
bun run test:type-perf

# Update baselines
bun run test:type-perf:update

# Type check
bun run typecheck
```

### Documentation

- 📖 [Full Guide](./TYPE_PERFORMANCE.md)
- 🚀 [Quick Start](./QUICK_START_TYPE_PERFORMANCE.md)
- 📝 [Setup Summary](./README_TYPE_PERFORMANCE.md)

---

## Conclusion

Your codebase is in good shape overall! You're already following many TypeScript performance best practices. The issues identified are primarily opportunities for incremental improvement rather than critical problems requiring immediate attention.

**Priority Focus Areas**:

1. Handle the large `.d.ts` declaration file (Issue #1)
2. Document the router splitting pattern you've already implemented
3. Extract deeply nested schemas in content strategy (Issue #4)
4. Reduce finance schema relations (Issue #5)

Continue running `bun run test:type-perf` in CI to prevent regressions, and monitor the metrics quarterly as your codebase grows.

---

**Generated by**: TypeScript Performance Analyzer
**Date**: 2026-01-22
**Next Review**: 2026-02-22 (30 days)
