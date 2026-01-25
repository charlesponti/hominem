# Quick Start: Finding TypeScript Performance Issues

This guide will help you quickly identify and fix TypeScript performance issues in your monorepo.

## Step 1: Identify the Problem

Run the type performance analyzer:

```bash
bun run analyze:type-perf
```

This generates a report showing:

- **Slowest type checks**: Operations taking the most time
- **High instantiation files**: Files causing TypeScript to work hardest

Example output:

```
⏱️  Top 20 Slowest Type Checks:

Duration (ms) | Event
--------------|------
        45.23 | checkSourceFile
        32.10 | checkExpression
        ...

📈 Top 20 Files by Type Instantiations:

Count     | File
----------|-----
     8234 | ./packages/trpc/src/routers/finance/finance.transactions.ts
     5432 | ./packages/db/src/schema/finance.schema.ts
     ...
```

## Step 2: Prioritize What to Fix

Focus on files with:

- **> 5,000 instantiations**: Likely causing noticeable slowdowns
- **> 10,000 instantiations**: Definitely needs optimization

## Step 3: Common Fixes

### Issue 1: Deeply Chained Utility Types

❌ **Before** (8,234 instantiations):

```typescript
type UpdateData = Partial<
  Pick<Omit<Required<Transaction>, 'id' | 'createdAt'>, 'amount' | 'description'>
>;
```

✅ **After** (1,423 instantiations):

```typescript
type TransactionWithoutMeta = Omit<Transaction, 'id' | 'createdAt'>;
type RequiredFields = Required<TransactionWithoutMeta>;
type EditableFields = Pick<RequiredFields, 'amount' | 'description'>;
type UpdateData = Partial<EditableFields>;
```

### Issue 2: Complex Generic Router Types

❌ **Before**:

```typescript
export const router = {
  list: procedure.input(z.object({...})).query(async ({ input }) => {
    // TypeScript has to infer everything
    return await queryTransactions(input);
  }),
};
```

✅ **After**:

```typescript
// Add explicit output types
type TransactionListOutput = QueryTransactionsOutput;

export const router = {
  list: procedure
    .input(z.object({...}))
    .query(async ({ input }): Promise<TransactionListOutput> => {
      return await queryTransactions(input);
    }),
};
```

### Issue 3: Large Union Types

❌ **Before**:

```typescript
type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'processing' | /* 50 more... */;
```

✅ **After**:

```typescript
// Use const assertion or enum
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  // ...
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
```

### Issue 4: Complex Drizzle Schema Relations

❌ **Before**:

```typescript
export const transactionRelations = relations(transactions, ({ one, many }) => ({
  // Multiple deeply nested relations inferred implicitly
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  fromAccount: one(accounts, { fields: [transactions.fromAccountId], references: [accounts.id] }),
  // ... many more
}));
```

✅ **After**:

```typescript
// Add explicit type exports for common query patterns
export type TransactionWithAccount = typeof transactions.$inferSelect & {
  account: typeof accounts.$inferSelect;
};

export type TransactionWithRelations = typeof transactions.$inferSelect & {
  account: typeof accounts.$inferSelect;
  fromAccount: typeof accounts.$inferSelect | null;
  toAccount: typeof accounts.$inferSelect | null;
};
```

## Step 4: Verify Improvement

After making changes, run the analyzer again:

```bash
bun run analyze:type-perf
```

Compare the numbers. You should see:

- Lower instantiation counts for files you optimized
- Faster overall type-checking time

## Step 5: Prevent Regressions

Add type performance tests for critical types:

```typescript
// packages/trpc/src/routers/finance/finance.transactions.type-perf.test.ts
import { attest } from '@ark/attest';
import type { inferRouterOutputs } from '@trpc/server';
import type { transactionsRouter } from './finance.transactions';

it('should efficiently infer router outputs', () => {
  attest(() => {
    type RouterOutputs = inferRouterOutputs<typeof transactionsRouter>;
    type Test = RouterOutputs;
  }).type.instantiations.lessThan(1000);
});
```

Run in CI:

```bash
bun run test:type-perf
```

## Benchmarks

Target metrics for your monorepo:

| Type Category               | Instantiation Target | Status        |
| --------------------------- | -------------------- | ------------- |
| Simple types (DTO, models)  | < 100                | ✅ Good       |
| Schema types with relations | < 500                | ✅ Good       |
| Router procedure types      | < 1,000              | ⚠️ Acceptable |
| Complete router types       | < 5,000              | ⚠️ Monitor    |
| Anything higher             | Review               | ❌ Optimize   |

## Troubleshooting

### "Type instantiation is excessively deep"

This error means you have recursive or deeply nested types. Fix by:

- Adding explicit type boundaries
- Breaking the recursion with simpler intermediate types
- Using type assertions where safe

### IDE is still slow after optimizations

- Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Check if you have circular dependencies between packages
- Consider using project references more effectively

### Trace generation fails

```bash
# Ensure TypeScript is installed and configured
bun add -D typescript

# Check your tsconfig.json is valid
bunx tsc --noEmit
```

## Resources

- [Full Documentation](./TYPE_PERFORMANCE.md)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [@ark/attest Documentation](https://github.com/arktypeio/arktype/tree/main/ark/attest)

## Quick Commands Reference

```bash
# Analyze performance
bun run analyze:type-perf

# Run type performance tests
bun run test:type-perf

# Update test snapshots
bun run test:type-perf:update

# Regular type check
bun run typecheck
```
