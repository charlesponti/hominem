import * as z from 'zod'

export const financeAccountSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  accountType: z.string(),
  balance: z.number(),
})

export const transactionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  accountId: z.uuid(),
  amount: z.number(),
  description: z.string(),
  date: z.string(),
})

export const financialInstitutionSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const budgetCategorySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
})

export type FinanceAccount = z.infer<typeof financeAccountSchema>
export type FinanceTransaction = z.infer<typeof transactionSchema>
export type FinancialInstitution = z.infer<typeof financialInstitutionSchema>
export type BudgetCategory = z.infer<typeof budgetCategorySchema>
