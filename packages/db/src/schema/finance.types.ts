/**
 * Computed Finance Types
 *
 * This file contains all derived types computed from Finance schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from finance.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import {
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
  TransactionTypeEnum,
  AccountTypeEnum,
  type TransactionType,
  type AccountType,
  type BudgetCategoryType,
  TransactionTypes,
} from './finance.schema'
import { createSelectSchema, createInsertSchema } from 'drizzle-zod'

// Inferred types from Drizzle schema
export type FinancialInstitution = InferSelectModel<typeof financialInstitutions>
export type FinancialInstitutionInsert = InferInsertModel<typeof financialInstitutions>
export type PlaidItem = InferSelectModel<typeof plaidItems>
export type PlaidItemInsert = InferInsertModel<typeof plaidItems>
export type FinanceAccount = InferSelectModel<typeof financeAccounts>
export type FinanceAccountInsert = InferInsertModel<typeof financeAccounts>
export type FinanceTransaction = InferSelectModel<typeof transactions>
export type FinanceTransactionInsert = InferInsertModel<typeof transactions>
export type BudgetCategory = InferSelectModel<typeof budgetCategories>
export type BudgetCategoryInsert = InferInsertModel<typeof budgetCategories>
export type BudgetGoal = InferSelectModel<typeof budgetGoals>
export type BudgetGoalInsert = InferInsertModel<typeof budgetGoals>

// Legacy aliases for backward compatibility
export type FinancialInstitutionOutput = FinancialInstitution
export type FinancialInstitutionInput = FinancialInstitutionInsert
export type FinancialInstitutionSelect = FinancialInstitution

export type PlaidItemOutput = PlaidItem
export type PlaidItemInput = PlaidItemInsert
export type PlaidItemSelect = PlaidItem

export type FinanceAccountOutput = FinanceAccount
export type FinanceAccountInput = FinanceAccountInsert
export type FinanceAccountSelect = FinanceAccount

export type FinanceTransactionOutput = FinanceTransaction
export type FinanceTransactionInput = FinanceTransactionInsert
export type FinanceTransactionSelect = FinanceTransaction

export type TransactionCreatePayload = FinanceTransactionInsert
export type TransactionUpdatePayload = Omit<FinanceTransactionInsert, 'userId' | 'id' | 'accountId'>

export type BudgetCategoryOutput = BudgetCategory
export type BudgetCategoryInput = BudgetCategoryInsert
export type BudgetCategorySelect = BudgetCategory

export type BudgetGoalOutput = BudgetGoal
export type BudgetGoalInput = BudgetGoalInsert
export type BudgetGoalSelect = BudgetGoal

// Re-export stable enums and constants
export { TransactionTypeEnum, AccountTypeEnum, TransactionTypes }
export type { TransactionType, AccountType, BudgetCategoryType }

// Re-export tables for convenience
export {
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
  financialInstitutionRelations,
  plaidItemRelations,
  financeAccountRelations,
  transactionRelations,
  budgetCategoryRelations,
} from './finance.schema'

// Zod schemas for API validation
export const FinanceAccountSchema = createSelectSchema(financeAccounts)
export const FinanceAccountInsertSchema = createInsertSchema(financeAccounts)
export const FinanceTransactionSchema = createSelectSchema(transactions)
export const TransactionInsertSchema = createInsertSchema(transactions)
export const BudgetCategorySchema = createSelectSchema(budgetCategories)
export const BudgetGoalSchema = createSelectSchema(budgetGoals)
export { TransactionLocationSchema, type TransactionLocation } from './shared.schema'
