# RPC Type Independence

## Principle

RPC type definitions should derive **exclusively** from RPC layer code, never from service layer abstractions. This ensures:

1. **Clean separation of concerns** - RPC layer is independent of service implementations
2. **Type safety** - Types accurately reflect what the API actually returns
3. **Maintainability** - Changes to services don't break RPC types
4. **Clarity** - RPC types document the API contract, not internal service details

## Current Status

### ✅ Compliant

- **invites.types.ts** - All types derived from `invites.ts` route schemas
  - Input: `z.infer<typeof invitesCreateSchema>` (from routes)
  - Output: Explicit types in types file
  - All schemas defined in RPC layer

### ⚠️ Needs Migration

- **finance.types.ts** - Imports service types
  - `QueryTransactionsOutput` from `@hominem/finance-services`
  - `FinanceAccount` from `@hominem/finance-services`
  - `AccountWithPlaidInfo` from `@hominem/finance-services`
  - `PlaidConnection` from `@hominem/finance-services`
  - `InstitutionConnection` from `@hominem/finance-services`

- **lists.types.ts** - Imports service types
  - `List` from `@hominem/lists-services`

- **places.types.ts** - Uses DB schema directly (acceptable as DB is lower-level infrastructure)
  - `Place` from `@hominem/db/schema` ✅

## Migration Strategy

### Pattern: Define Output Types in RPC Layer

For each service type used, replace with explicit RPC output type definition.

#### Example: Before (Finance)

```typescript
// types/finance.types.ts
import type { FinanceAccount, AccountWithPlaidInfo } from '@hominem/finance-services';

export type AccountListOutput = JsonSerialized<FinanceAccount[]>;
export type AccountGetOutput = JsonSerialized<
  AccountWithPlaidInfo & { transactions: FinanceTransaction[] }
>;
```

**Problem:** Depends on service layer abstractions

#### Example: After (Finance)

```typescript
// types/finance.types.ts
// No imports from @hominem/finance-services

export type AccountListOutput = JsonSerialized<
  {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'investment';
    institutionId: string;
    mask: string | null;
    balance: number;
    currency: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[]
>;

export type AccountGetOutput = JsonSerialized<{
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  institutionId: string;
  mask: string | null;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Plaid-specific fields from service
  plaidItemId: string | null;
  plaidAccessToken: string | null;
  plaidInstitutionId: string | null;
  // Transactions
  transactions: {
    id: string;
    date: string;
    amount: number;
    description: string;
    category: string | null;
    type: 'debit' | 'credit';
  }[];
}> | null;
```

**Benefits:**

- No service layer dependency
- Type clearly shows what API returns
- Changes to service don't affect RPC types
- Can evolve RPC and service independently

### Pattern: Define Reusable Output Types

If an output type is used by multiple endpoints, define it once in the types file:

```typescript
// types/finance.types.ts

// Reusable output types
export interface AccountData {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  institutionId: string;
  mask: string | null;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaidAccountData extends AccountData {
  plaidItemId: string | null;
  plaidAccessToken: string | null;
  plaidInstitutionId: string | null;
}

// Endpoint outputs using reusable types
export type AccountListOutput = JsonSerialized<AccountData[]>;
export type AccountGetOutput = JsonSerialized<
  PlaidAccountData & { transactions: TransactionData[] }
> | null;
export type AccountCreateOutput = JsonSerialized<AccountData>;
```

## Actionable Steps

### 1. Audit All Type Files

For each `*types.ts` file:

```bash
grep "from '@hominem/" packages/hono-rpc/src/types/*.ts | grep -v "@hominem/db"
```

Check each import:

- ✅ `@hominem/db/schema` - Acceptable (DB is infrastructure layer)
- ❌ `@hominem/*-services` - Needs migration
- ✅ `./utils` - Acceptable (RPC utilities)
- ✅ `../routes/` - Acceptable (RPC routes)

### 2. For Each Service Import

1. Find the service type used
2. Determine the actual shape returned by RPC routes
3. Define explicit output type in `*types.ts`
4. Remove service import
5. Verify routes still use correct types

### 3. Update Route Handlers (if needed)

If routes import service types for response validation:

```typescript
// Before (routes/finance.accounts.ts)
import type { FinanceAccount } from '@hominem/finance-services';

const result: FinanceAccount = await fetchAccount();
```

```typescript
// After (routes/finance.accounts.ts)
// Import output type from types file for validation
import type { AccountGetOutput } from '../types/finance.types';

const result = await fetchAccount();
// result is validated by c.json() based on what actually gets returned
```

## Type Compliance Checklist

- [ ] Finance types - Remove all service imports
  - [ ] Replace `QueryTransactionsOutput`
  - [ ] Replace `FinanceAccount`
  - [ ] Replace `AccountWithPlaidInfo`
  - [ ] Replace `PlaidConnection`
  - [ ] Replace `InstitutionConnection`

- [ ] Lists types - Remove service imports
  - [ ] Replace `List` with explicit RPC output type

- [ ] All other types - Verify no service imports
  - [ ] Admin ✅
  - [ ] Invites ✅
  - [ ] Items ✅
  - [ ] People ✅
  - [ ] Places ✅
  - [ ] Trips ✅
  - [ ] User ✅

## Benefits of Independence

### Type Safety

```typescript
// RPC types document the actual API contract
export type AccountListOutput = JsonSerialized<Account[]>;
// Not dependent on service layer implementation details
```

### Decoupled Evolution

```typescript
// Service can evolve independently
// @hominem/finance-services adds new fields
export interface FinanceAccount {
  // old fields
  // new internal fields used only by service
}

// RPC continues to work with its own definition
// of what it returns to clients
export type AccountListOutput = JsonSerialized<AccountData[]>;
```

### Clear API Contracts

```typescript
// Types clearly show what clients receive
// Not abstract service types
export type AccountGetOutput = {
  id: string;
  name: string;
  balance: number;
  // ... all fields clients care about
};
```

### Easier Testing

```typescript
// Can mock RPC responses without service layer
const mockOutput: AccountListOutput = [
  { id: '1', name: 'Checking', balance: 1000, ... }
];
```

## References

- [RPC_TYPES_FINAL_APPROACH.md](RPC_TYPES_FINAL_APPROACH.md) - Overall type strategy
- [RPC_TYPES_UTILITIES.md](RPC_TYPES_UTILITIES.md) - Utility types (JsonSerialized, EmptyInput)
- Invites types as example of proper RPC type independence

## Implementation Priority

1. **High** - Finance types (most service dependencies)
2. **Medium** - Lists types
3. **Low** - Others (mostly compliant)

All should be addressed before merging to maintain architecture integrity.
