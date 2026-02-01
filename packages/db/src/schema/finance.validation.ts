import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

import {
  type TransactionLocation,
  TransactionLocationSchema,
} from './shared.schema';
import {
  financeAccounts,
  transactions,
  type TransactionType,
  TransactionTypeEnum,
  AccountTypeEnum,
} from './finance.schema';

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

// Export types from Zod schemas for convenience
export type FinanceAccount = z.infer<typeof FinanceAccountSchema>;
export type FinanceAccountInsert = z.infer<typeof FinanceAccountInsertSchema>;
export type FinanceTransaction = z.infer<typeof TransactionSchema>;
export type FinanceTransactionInsert = z.infer<typeof TransactionInsertSchema>;
