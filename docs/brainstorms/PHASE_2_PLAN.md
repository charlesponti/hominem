# Phase 2: Low-Risk Standardization & Consolidation

**Status**: Planning Complete  
**Created**: 2026-02-03  
**Estimated Effort**: 1-2 hours  
**Risk Level**: Low (no data changes, refactoring only)  

## Objective

Consolidate Zod validation schemas into `.schema.ts` files to standardize code organization and reduce file count. This improves maintainability and follows the pattern where schema definitions and their validations live in the same file.

## Current State

### Validation Files to Consolidate
1. **users.validation.ts** (7 lines)
   - Exports: `UserSchema`, `UserSchemaType`
   - Dependencies: `createInsertSchema` from `drizzle-zod`
   - Imports: `users` table from `users.schema.ts`

2. **finance.validation.ts** (50 lines)
   - Exports: 
     - `FinanceAccountSchema`, `FinanceAccountInsertSchema`
     - `insertTransactionSchema`, `updateTransactionSchema`
     - `TransactionSchema`, `TransactionInsertSchema`
     - Type exports: `FinanceAccount`, `FinanceAccountInsert`, `FinanceTransaction`, `FinanceTransactionInsert`
   - Dependencies: `createInsertSchema`, `createSelectSchema` from `drizzle-zod`, `z` from `zod`
   - Imports: `financeAccounts`, `transactions` from `finance.schema.ts` and enums from `shared.schema.ts`

### Barrel Export
- **schema/validations.ts** (25 lines)
  - Re-exports all validation schemas
  - Documentation and usage examples
  - **Currently not imported anywhere in the codebase**

### Custom Zod Schemas Already in `.schema.ts` Files
The following schemas already define Zod types inline:
- `finance.schema.ts`: `TransactionTypeEnum`, `AccountTypeEnum`
- `notes.schema.ts`: `NoteStatusSchema`, `PublishingMetadataSchema`
- `goals.schema.ts`: `GoalStatusSchema`, `GoalMilestoneSchema`, `GoalSchema`
- `tasks.schema.ts`: `TaskStatusSchema`, `TaskPrioritySchema`
- `shared.schema.ts`: `ContentTagSchema`, `BaseContentTypeSchema`, `PublishingContentTypeSchema`, `TransactionLocationSchema`

## Implementation Plan

### Step 1: Consolidate users.validation.ts → users.schema.ts

**Changes**:
1. Add to `users.schema.ts`:
   ```typescript
   import { createInsertSchema } from 'drizzle-zod';
   
   export const UserSchema = createInsertSchema(users);
   export type UserSchemaType = typeof UserSchema;
   ```

2. Delete `users.validation.ts`

3. Update `schema/validations.ts`:
   ```typescript
   export { UserSchema } from './users.schema';
   ```

**Files Modified**: 
- users.schema.ts (add 3 lines)
- validations.ts (update 1 line)

**Files Deleted**:
- users.validation.ts

### Step 2: Consolidate finance.validation.ts → finance.schema.ts

**Changes**:
1. Add to `finance.schema.ts`:
   ```typescript
   import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
   
   // Finance Account Validation Schemas
   export const FinanceAccountSchema = createSelectSchema(financeAccounts, {
     type: AccountTypeEnum,
     meta: z.custom<unknown>().optional().nullable(),
   });
   
   export const FinanceAccountInsertSchema = createInsertSchema(financeAccounts, {
     type: AccountTypeEnum,
     meta: z.custom<unknown>().optional().nullable(),
   });
   
   // Transaction Validation Schemas
   export const insertTransactionSchema = createInsertSchema(transactions, {
     type: TransactionTypeEnum,
     location: TransactionLocationSchema.optional().nullable(),
   });
   
   export const updateTransactionSchema = createSelectSchema(transactions);
   
   export const TransactionSchema = createSelectSchema(transactions, {
     type: TransactionTypeEnum,
     location: TransactionLocationSchema.optional().nullable(),
   });
   
   export const TransactionInsertSchema = createInsertSchema(transactions, {
     type: TransactionTypeEnum,
     location: TransactionLocationSchema.optional().nullable(),
   });
   
   // Export types from Zod schemas
   export type FinanceAccount = z.infer<typeof FinanceAccountSchema>;
   export type FinanceAccountInsert = z.infer<typeof FinanceAccountInsertSchema>;
   export type FinanceTransaction = z.infer<typeof TransactionSchema>;
   export type FinanceTransactionInsert = z.infer<typeof TransactionInsertSchema>;
   ```

2. Delete `finance.validation.ts`

3. Update `schema/validations.ts`:
   ```typescript
   export {
     FinanceAccountSchema,
     FinanceAccountInsertSchema,
     insertTransactionSchema,
     updateTransactionSchema,
     TransactionSchema,
     TransactionInsertSchema,
     type FinanceAccount,
     type FinanceAccountInsert,
     type FinanceTransaction,
     type FinanceTransactionInsert,
   } from './finance.schema';
   ```

**Files Modified**:
- finance.schema.ts (add ~50 lines)
- validations.ts (update 8-10 lines)

**Files Deleted**:
- finance.validation.ts

### Step 3: Verify & Test

1. **TypeScript Check**:
   ```bash
   bun run typecheck
   ```
   Verify no broken imports or type errors.

2. **Run Tests**:
   ```bash
   bun run test
   ```
   All 35 test suites must pass.

3. **Lint Check**:
   ```bash
   bun run lint --parallel
   ```
   No linting errors.

4. **Safety Check**:
   ```bash
   bun run check
   ```
   All validations pass.

### Step 4: Create Pull Request

**PR Title**: `refactor(db): Phase 2 - Consolidate Zod schemas into .schema.ts files`

**PR Body Structure**:
```
## Summary
Consolidate Zod validation schemas to standardize file organization and reduce file count.

## What Changed
- Moved users.validation.ts schemas → users.schema.ts
- Moved finance.validation.ts schemas → finance.schema.ts
- Updated schema/validations.ts barrel exports
- Deleted 2 validation files

## Benefits
1. Single source of truth for schema definition and validation
2. Reduced file count (30 → 28 schema files)
3. Follows existing pattern in notes.schema.ts, goals.schema.ts, tasks.schema.ts, etc.
4. Simplifies imports for consumers

## Files Modified
- packages/db/src/schema/users.schema.ts (+3 lines)
- packages/db/src/schema/finance.schema.ts (+50 lines)
- packages/db/src/schema/validations.ts (updated exports)

## Files Deleted
- packages/db/src/schema/users.validation.ts
- packages/db/src/schema/finance.validation.ts

## Quality Assurance
- ✅ All 42 packages pass TypeScript checks
- ✅ All 35 test suites pass
- ✅ All linting checks pass
- ✅ No breaking changes (all exports preserved through validations.ts)

## Notes
- The validations.ts barrel file is retained for backward compatibility
- Consumers importing from @hominem/db/schema/validations will see no changes
- This consolidation follows the pattern already established in:
  - notes.schema.ts (NoteStatusSchema, PublishingMetadataSchema)
  - goals.schema.ts (GoalStatusSchema, GoalMilestoneSchema, GoalSchema)
  - tasks.schema.ts (TaskStatusSchema, TaskPrioritySchema)
  - shared.schema.ts (ContentTagSchema, etc.)
```

## Risk Assessment

**Risk Level**: ✅ LOW

**Why It's Safe**:
1. No database schema changes (pure file reorganization)
2. All exports preserved through `validations.ts` barrel
3. Existing imports continue to work without changes
4. No data migrations needed
5. Zero breaking changes for consumers

**What Could Go Wrong**:
- Circular dependency in finance.schema.ts (uses `TransactionLocationSchema` from shared.schema.ts)
  - **Mitigation**: Verify shared.schema.ts doesn't import from finance.schema.ts
- Import ordering issues
  - **Mitigation**: Run typecheck after consolidation

## Rollback Plan

If issues arise, revert to previous commit:
```bash
git revert HEAD
```

All validation exports will be restored via `users.validation.ts` and `finance.validation.ts`.

## Success Criteria

- [ ] All TypeScript checks pass (bun run typecheck)
- [ ] All tests pass (bun run test)
- [ ] All linting passes (bun run lint --parallel)
- [ ] Safety check passes (bun run check)
- [ ] PR created and ready for review
- [ ] No breaking changes to API/exports

## Follow-up Tasks

After Phase 2 is merged:
1. **Phase 3 Planning**: Medium-risk changes (timestamps, NOT NULL constraints)
2. **Future**: Consider moving all Zod schemas inline as TypeScript/Zod ecosystem matures
3. **Documentation**: Update SCHEMA_STANDARDS.md with consolidated pattern

## Timing & Dependencies

- **Prerequisite**: Phase 1 must be merged first
- **Duration**: ~1-2 hours
- **No blocking dependencies**: This is purely code organization
- **Can be done in parallel**: No conflicts with other work
