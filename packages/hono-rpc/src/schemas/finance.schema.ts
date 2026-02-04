import { z } from 'zod'

import {
  FinanceAccountSchema as DbFinanceAccountSchema,
  TransactionSchema as DbTransactionSchema,
  FinancialInstitutionSchema as DbFinancialInstitutionSchema,
  BudgetCategorySchema as DbBudgetCategorySchema,
} from '@hominem/db/schema/finance'

export const financeAccountSchema = DbFinanceAccountSchema.extend({})
export const transactionSchema = DbTransactionSchema.extend({
  authorizedDate: z.string().nullable().optional(),
})
export const financialInstitutionSchema = DbFinancialInstitutionSchema.extend({})
export const budgetCategorySchema = DbBudgetCategorySchema.extend({})

export type FinanceAccount = z.infer<typeof financeAccountSchema>
export type FinanceTransaction = z.infer<typeof transactionSchema>
export type FinancialInstitution = z.infer<typeof financialInstitutionSchema>
export type BudgetCategory = z.infer<typeof budgetCategorySchema>

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
})

export type AccountWithPlaidInfo = z.infer<typeof accountWithPlaidInfoSchema>
