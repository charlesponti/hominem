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

## Task 3: Schema File Structure & Dependencies Analysis

### Key Findings

#### Schema Inventory
- **32 total schema files** in `packages/db/src/schema/`
- **160+ table/enum exports** across all files
- **13 files with local dependencies** (cross-imports within schema folder)
- **19 files with no local dependencies** (pure definitions)

#### Dependency Statistics
- **Root modules (no dependencies)**: 7 files
  - activity, auth, company, health, shared, tags, users
- **Single-level dependencies**: 11 files
  - Most common: import from `users` (24+ imports total)
- **Multi-level chains**: 14 files
  - Longest chain: 4 levels (calendar → places → items ↔ lists → travel)

#### Central Hub Modules
1. **users** (imported by 24+ files) — core domain, in almost every schema
2. **shared** (imported by 2 files) — utility collection with 23 exports
3. **company** (imported by 3 files) — business entity
4. **career** (imported by 2 files) — career progression
5. **items** (imported by 3 files, circular) — core entity with cross-deps

#### Circular Dependencies (3 confirmed)
1. **items ↔ lists**
   - items.schema.ts imports list (line 12)
   - lists.schema.ts imports item (line 12)
   - Root cause: Relations between items and lists defined in both files
   
2. **items ↔ places**
   - items.schema.ts imports place (line 13)
   - places.schema.ts imports item (via type)
   - Root cause: ItemType enum references flight/place distinctions
   
3. **lists ↔ travel**
   - lists.schema.ts imports flight (line 13)
   - travel.schema.ts imports list (via relations)
   - Root cause: Cross-domain relations

### Mitigation Notes
- Cycles are at **Drizzle relation level**, not runtime
- Cycles are **manageable** but block full lazy-loading optimization
- **Phase 3 opportunity**: Extract shared types to `shared.schema.ts` to break cycles

### Processing Order Recommendation
For type generation script (Task 1), process in dependency order:
1. Root (no deps): activity, auth, company, health, shared, tags, users
2. Level 1: bookmarks, categories, chats, contacts, documents, finance, goals, movies, music, surveys, vector-documents, trips
3. Level 2: career, networking_events, possessions, skills
4. Level 3: calendar, interviews
5. Circular group: items, lists, places, travel, trip_items

### Export Density
- Most schemas: 1-6 exports
- Heavy modules: shared (23), finance (18), career (12)
- Design implication: shared.ts is an anti-pattern (too many exports); consider splitting

### Implications for Phase 2
- ✅ Type generation can proceed using this order
- ✅ Barrel export removal will work (Drizzle wildcard pattern)
- ⚠️ Circular imports will persist (not fixable in Phase 2)
- ✅ Generated types can handle circular deps (Drizzle supports them)
