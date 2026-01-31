# Type Optimization - Learnings & Decisions

## Phase 1: Finance Types - Shared Types Replacement

**Date**: 2026-01-30  
**Task**: Replace 4 duplicate type definitions with imports from DB schema  
**File**: `packages/hono-rpc/src/types/finance/shared.types.ts`

### Changes Made

1. **Import Path Discovery**
   - **Challenge**: Initial import path `@hominem/db/schema/finance.types` failed with "Cannot find module"
   - **Solution**: Types are exported from schema index at `@hominem/db/schema`
   - **Lesson**: Schema types are re-exported from main schema index, not individual files
   - **Verification**: Confirmed in `/packages/db/src/schema/index.ts` (lines 100, 123)

2. **Type Replacements**
   ```typescript
   // Before: 150+ lines of duplicate definitions
   export type InstitutionData = { id: string; name: string; ... }
   export type BudgetCategoryData = { id: string; name: string; ... }
   export type AccountData = { id: string; userId: string; ... }
   export type TransactionData = { id: string; accountId: string; ... }
   
   // After: 4 lines of aliases
   export type InstitutionData = FinancialInstitutionOutput
   export type BudgetCategoryData = BudgetCategoryOutput
   export type AccountData = FinanceAccountOutput
   export type TransactionData = FinanceTransactionOutput
   ```

3. **Type Compatibility Issue Fixed**
   - **Problem**: `AccountWithPlaidData` extended `AccountData` which now comes from DB
   - **Incompatibility**: DB type has `plaidItemId: string | null` but extension used `plaidItemId?: string`
   - **Solution**: Updated extension to `plaidItemId?: string | null` to match DB type
   - **Rule**: When extending DB types, match the nullability exactly (`null` vs `undefined`)

4. **API-Specific Types Preserved**
   - `PlaidConnection` - Plaid-specific wrapper, kept as-is
   - `AccountWithPlaidData` - API extension for frontend convenience, kept as-is
   - `TimeSeriesDataPoint` - Computed analytics type, kept as-is
   - `TimeSeriesStats` - Computed analytics type, kept as-is

### Results

✅ **Code Reduction**: 153 → 92 lines (40% reduction)  
✅ **Typecheck**: Zero errors in `@hominem/hono-rpc` package  
✅ **Full Build**: All 12 hono-rpc tasks passed

### Key Insights

1. **Single Source of Truth**: DB types are always the canonical definition
2. **Import from Schema Index**: Always use `@hominem/db/schema`, not individual schema files
3. **Type Compatibility**: When aliasing or extending DB types, respect exact nullability signatures
4. **API Extensions**: Types that extend DB types with API-specific fields belong in hono-rpc, not DB

### Next Steps

1. **Phase 2**: Update dependent files that reference these aliased types
   - `finance/accounts.types.ts` - references `AccountData`
   - `finance/transactions.types.ts` - references `TransactionData`
   - `finance/budget.types.ts` - references `BudgetCategoryData`
   - `finance/institutions.types.ts` - references `InstitutionData`

2. **Phase 3**: Audit other domains for similar duplications
   - Lists types (high priority)
   - Notes types (high priority)
   - Events types (medium priority)

### Architecture Pattern Applied

```
DATABASE TYPES (Source of Truth)
  ↓
  import from @hominem/db/schema
  ↓
API ALIASES & EXTENSIONS in hono-rpc
  ↓
  Used by frontend + API layer
```

This pattern eliminates drift and ensures type safety across the entire stack.
