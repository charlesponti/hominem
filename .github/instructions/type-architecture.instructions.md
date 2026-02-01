# Type Architecture - Single Source of Truth

**CRITICAL RULE**: Database types are the ONLY source of truth. Never redefine types that exist in the database layer.

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA FLOW (ONE WAY)                     │
└─────────────────────────────────────────────────────────────┘

DB Schema (Source of Truth)
    ↓
Service Layer (imports from DB, may extend)
    ↓
API Routes (imports from Service/DB)
    ↓
Client (infers from API)
```

## Import Rules

### ✅ CORRECT: Direct, Lean Imports

```typescript
// Import table definitions
import { users, financeAccounts } from '@hominem/db/schema/users'
import { transactions } from '@hominem/db/schema/finance'

// Import types (pre-computed, optimized)
import type { UserOutput, UserInput } from '@hominem/db/schema/users.types'
import type { FinanceAccountOutput } from '@hominem/db/schema/finance.types'
import type { TransactionOutput } from '@hominem/db/schema/finance.types'
```

### ❌ WRONG: Barrel Imports

```typescript
// BAD - loads entire schema module graph
import { users, transactions } from '@hominem/db/schema'
import type { UserOutput } from '@hominem/db/schema'
```

### ❌ WRONG: Manual Type Redefinition (Type Drift Risk)

```typescript
// BAD - manually redefining DB types
export type AccountData = {
  id: string
  userId: string
  name: string
  // ... this will drift from DB schema
}

// GOOD - import from source of truth
import type { FinanceAccountOutput as AccountData } from '@hominem/db/schema/finance.types'
```

## File Structure

```
packages/db/src/schema/
  ├── users.schema.ts       # Drizzle table definitions (tables, relations)
  ├── users.types.ts        # Pre-computed types (UserOutput, UserInput, etc)
  ├── finance.schema.ts     # Finance tables
  ├── finance.types.ts      # Finance types
  ├── chats.schema.ts
  ├── chats.types.ts
  └── ...
```

## Type Naming Convention

Each domain follows this pattern:

```typescript
// In {domain}.types.ts

// Output types (SELECT queries)
export type {EntityName}Output = {EntityName}
export type {EntityName}Select = {EntityName}  // Alias for consistency

// Input types (INSERT queries)
export type {EntityName}Input = {EntityName}Insert

// Extended types (with relations, computed fields)
export type {EntityName}WithRelations = {EntityName}Output & {
  relationName: RelatedType[]
}
```

Example for `users.types.ts`:
```typescript
export type UserOutput = User
export type UserSelect = User
export type UserInput = UserInsert
```

Example for `finance.types.ts`:
```typescript
export type FinanceAccountOutput = FinanceAccount
export type FinanceAccountInput = FinanceAccountInsert
export type FinanceTransactionOutput = FinanceTransaction
export type FinanceTransactionInput = FinanceTransactionInsert
```

## API/Service Layer Extensions

If you need to add fields NOT in the database (e.g., computed values, aggregates):

```typescript
// ✅ GOOD - Extend, don't redefine
import type { FinanceAccountOutput } from '@hominem/db/schema/finance.types'

export type AccountWithPlaidInfo = FinanceAccountOutput & {
  institutionName?: string
  isPlaidConnected: boolean
  plaidLastSynced?: string
}
```

## Input/Output Schemas for API Routes

Use Zod schemas for validation, but derive from DB types:

```typescript
import { createSelectSchema, createInsertSchema } from 'drizzle-zod'
import { financeAccounts } from '@hominem/db/schema/finance'

// ✅ GOOD - Generated from DB schema
export const AccountSelectSchema = createSelectSchema(financeAccounts)
export const AccountInsertSchema = createInsertSchema(financeAccounts)

// ✅ GOOD - Extend for API-specific validation
export const AccountCreateInputSchema = AccountInsertSchema.pick({
  name: true,
  type: true,
  balance: true,
}).extend({
  institutionId: z.string().uuid().optional(),
})
```

## Migration Path

When refactoring existing code:

1. **Identify Duplicates**: Find manual type definitions that duplicate DB types
2. **Replace with Imports**: Use direct imports from `@hominem/db/schema/{domain}.types`
3. **Handle Extensions**: Use intersections (`&`) for API-specific fields
4. **Verify**: Run typecheck to ensure no drift

Example:
```typescript
// BEFORE (BAD - manual definition)
export type TransactionData = {
  id: string
  amount: number
  // ... 20+ fields manually typed
}

// AFTER (GOOD - import from source of truth)
import type { FinanceTransactionOutput as TransactionData } from '@hominem/db/schema/finance.types'
```

## Benefits

1. **Zero Type Drift**: DB changes propagate instantly to all layers
2. **Better Performance**: TypeScript caches DB types, doesn't revalidate duplicates
3. **Less Code**: Delete hundreds of lines of duplicate definitions
4. **Single Source of Truth**: DB schema is authoritative

## Verification

Run these checks:

```bash
# Type check (should be faster after refactor)
bun run typecheck

# Search for potential duplicates
rg "export type.*Output.*=" packages/hono-rpc/src/types/
rg "export type.*Data.*=" packages/hono-rpc/src/types/
```

## Summary

- **Import paths**: Always direct, never barrel exports
- **Table imports**: `@hominem/db/schema/{domain}`
- **Type imports**: `@hominem/db/schema/{domain}.types`
- **Never redefine**: Import and extend, don't copy
- **Naming**: `{Entity}Output`, `{Entity}Input`, `{Entity}Select`
