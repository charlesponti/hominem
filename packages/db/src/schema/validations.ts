/**
 * Zod Validation Schemas
 *
 * This module exports all Zod validation schemas for database entities.
 * These are separated from the Drizzle schema definitions to avoid importing
 * Zod in schema files, which keeps type-checking fast.
 *
 * Usage:
 *   import { FinanceAccountSchema } from '@packages/db/schema/validations';
 */

export { UserSchema } from './users.validation';
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
} from './finance.validation';
