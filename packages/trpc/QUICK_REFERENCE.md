# TRPC Type Performance - Quick Reference Card

## 🚀 Use This, Not That

### ❌ SLOW - Don't Use Full App Router Types

```typescript
import type { AppRouterOutputs } from '@hominem/trpc';

type Data = AppRouterOutputs['finance']['transactions']['list'];
```

**Why slow**: TypeScript infers all 17 routers (~10,000 instantiations)

---

### ⚡ GOOD - Use Per-Feature Types

```typescript
import type { FinanceRouterOutputs } from '@hominem/trpc';

type Data = FinanceRouterOutputs['transactions']['list'];
```

**Performance**: 80% faster (~2,000 instantiations)

---

### ⚡⚡ BEST - Use Direct Procedure Types

```typescript
import type { TransactionListOutput } from '@hominem/trpc/router-types';

type Data = TransactionListOutput;
```

**Performance**: 90% faster (~50 instantiations)

---

## 📦 Available Type Exports

### Direct Procedure Types (Fastest)

```typescript
import type {
  // Finance Transactions
  TransactionListInput,
  TransactionListOutput,
  TransactionCreateOutput,
  TransactionUpdateOutput,
  TransactionDeleteOutput,
  SortDirection,
} from '@hominem/trpc/router-types';
```

### Per-Feature Router Types (Fast)

```typescript
import type {
  FinanceRouterInputs,
  FinanceRouterOutputs,
  NotesRouterInputs,
  NotesRouterOutputs,
  ChatsRouterInputs,
  ChatsRouterOutputs,
  EventsRouterInputs,
  EventsRouterOutputs,
  ContentRouterInputs,
  ContentRouterOutputs,
  TwitterRouterInputs,
  TwitterRouterOutputs,
} from '@hominem/trpc';
```

---

## 🎯 Common Patterns

### Component Props

```typescript
import type { TransactionListOutput } from '@hominem/trpc/router-types';

interface TransactionTableProps {
  transactions: TransactionListOutput;
  onRefresh: () => void;
}
```

### API Client Usage

```typescript
import type { TransactionListOutput } from '@hominem/trpc/router-types';

// Explicit type breaks inference chain
const data: TransactionListOutput = await trpc.finance.transactions.list.query(input);
```

### Multiple Routers

```typescript
import type { FinanceRouterOutputs, NotesRouterOutputs } from '@hominem/trpc';

interface DashboardData {
  transactions: FinanceRouterOutputs['transactions']['list'];
  notes: NotesRouterOutputs['list'];
}
```

---

## 🔄 Migration Examples

### Example 1: List Component

**Before**:

```typescript
import type { AppRouterOutputs } from '@hominem/trpc';

interface Props {
  data: AppRouterOutputs['finance']['transactions']['list'];
}
```

**After**:

```typescript
import type { TransactionListOutput } from '@hominem/trpc/router-types';

interface Props {
  data: TransactionListOutput;
}
```

---

### Example 2: API Hook

**Before**:

```typescript
const { data } = trpc.finance.transactions.list.useQuery(input);
// TypeScript infers from full app router
```

**After**:

```typescript
import type { TransactionListOutput } from '@hominem/trpc/router-types';

const { data } = trpc.finance.transactions.list.useQuery(input);
// Use explicit type when needed
const typedData: TransactionListOutput | undefined = data;
```

---

### Example 3: Sort Parameters

**Before**:

```typescript
{
  sortBy: 'date',              // string
  sortDirection: 'desc',       // 'asc' | 'desc'
}
```

**After**:

```typescript
{
  sortBy: ['date'],            // string[]
  sortDirection: ['desc'],     // ('asc' | 'desc')[]
}
```

---

## 📊 Performance Comparison

| Pattern          | Instantiations | Speed               | Use Case                         |
| ---------------- | -------------- | ------------------- | -------------------------------- |
| Direct procedure | ~50            | ⚡⚡⚡⚡ 90% faster | Single procedure                 |
| Per-feature      | ~2,000         | ⚡⚡⚡ 80% faster   | Multiple procedures, one feature |
| Full app         | ~10,000        | ❌ Baseline         | Internal tRPC code only          |

---

## 🧪 Run Tests

```bash
# Type performance tests
bun run test:type-perf

# Update snapshots
bun run test:type-perf:update

# Analyze overall performance
bun run analyze:type-perf
```

---

## 📚 Documentation

- **Complete Guide**: `TYPE_PERFORMANCE_GUIDE.md`
- **Optimization Summary**: `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- **Issues Report**: `../../TYPE_PERFORMANCE_ISSUES_REPORT.md`

---

## ⚠️ Common Mistakes

### Mistake 1: Using Full App Types

```typescript
// ❌ Don't
import type { AppRouterOutputs } from '@hominem/trpc';
```

### Mistake 2: Forgetting Array Syntax

```typescript
// ❌ Don't (no longer supported)
{ sortBy: 'date', sortDirection: 'desc' }

// ✅ Do
{ sortBy: ['date'], sortDirection: ['desc'] }
```

### Mistake 3: Not Using Explicit Types

```typescript
// ❌ Slow - relies on full inference
const data = await trpc.finance.transactions.list.query(input);

// ✅ Fast - explicit type
const data: TransactionListOutput = await trpc.finance.transactions.list.query(input);
```

---

## 💡 Pro Tips

1. **Always use explicit return types** in router definitions
2. **Import from `router-types.ts`** when available
3. **Use per-feature types** for multi-procedure components
4. **Run type perf tests** before merging new routers
5. **Check IDE performance** - if slow, you're using wrong types

---

**Need Help?** Check the full guide at `TYPE_PERFORMANCE_GUIDE.md`

**Last Updated**: 2026-01-22
