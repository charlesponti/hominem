import {
  FinanceAccountSchema as DbFinanceAccountSchema,
  TransactionSchema as DbTransactionSchema,
  FinancialInstitutionSchema as DbFinancialInstitutionSchema,
  BudgetCategorySchema as DbBudgetCategorySchema,
} from '@hominem/db/schema/finance';
import * as z from 'zod';

export const financeAccountSchema = DbFinanceAccountSchema.extend({});
export const transactionSchema = DbTransactionSchema.extend({
  authorizedDate: z.string().nullable().optional(),
});
const financialInstitutionSchema = DbFinancialInstitutionSchema.extend({});
const budgetCategorySchema = DbBudgetCategorySchema.extend({});

type FinanceAccount = z.infer<typeof financeAccountSchema>;
type FinanceTransaction = z.infer<typeof transactionSchema>;
type FinancialInstitution = z.infer<typeof financialInstitutionSchema>;
type BudgetCategory = z.infer<typeof budgetCategorySchema>;

export const accountWithPlaidInfoSchema = financeAccountSchema.extend({
  institutionName: z.string().nullable(),
  institutionLogo: z.string().nullable(),
  isPlaidConnected: z.boolean(),
  plaidItemStatus: z.string().nullable(),
  plaidItemError: z.unknown().nullable(),
  plaidLastSyncedAt: z.string().nullable(),
  plaidItemInternalId: z.string().nullable(),
  plaidInstitutionId: z.string().nullable(),
  plaidInstitutionName: z.string().nullable(),
});

export type AccountWithPlaidInfo = z.infer<typeof accountWithPlaidInfoSchema>;
