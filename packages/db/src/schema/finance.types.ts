/**
 * Computed Finance Types
 *
 * This file contains all derived types computed from Finance schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from finance.schema.ts
 */

import type {
  FinancialInstitution,
  FinancialInstitutionInsert,
  PlaidItem,
  PlaidItemInsert,
  FinanceAccount,
  FinanceAccountInsert,
  FinanceTransaction,
  FinanceTransactionInsert,
  BudgetCategory,
  BudgetCategoryInsert,
  BudgetGoal,
  BudgetGoalInsert,
} from './finance.schema';
import {
  TransactionTypeEnum,
  AccountTypeEnum,
  type TransactionType,
  type BudgetCategoryType,
  TransactionTypes,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
} from './finance.schema';
import { TransactionLocationSchema, type TransactionLocation } from './shared.schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';

// ============================================
// FINANCIAL INSTITUTION TYPES
// ============================================

export type FinancialInstitutionOutput = FinancialInstitution;
export type FinancialInstitutionInput = FinancialInstitutionInsert;
export type FinancialInstitutionSelect = FinancialInstitution;

// ============================================
// PLAID ITEM TYPES
// ============================================

export type PlaidItemOutput = PlaidItem;
export type PlaidItemInput = PlaidItemInsert;
export type PlaidItemSelect = PlaidItem;

// ============================================
// FINANCE ACCOUNT TYPES
// ============================================

export type FinanceAccountOutput = FinanceAccount;
export type FinanceAccountInput = FinanceAccountInsert;
export type FinanceAccountSelect = FinanceAccount;

// ============================================
// TRANSACTION TYPES
// ============================================

export type FinanceTransactionOutput = FinanceTransaction;
export type FinanceTransactionInput = FinanceTransactionInsert;
export type FinanceTransactionSelect = FinanceTransaction;

export type TransactionCreatePayload = FinanceTransactionInsert;
export type TransactionUpdatePayload = Omit<FinanceTransactionInsert, 'userId' | 'id' | 'accountId'>;

// ============================================
// BUDGET TYPES
// ============================================

export type BudgetCategoryOutput = BudgetCategory;
export type BudgetCategoryInput = BudgetCategoryInsert;
export type BudgetCategorySelect = BudgetCategory;

export type BudgetGoalOutput = BudgetGoal;
export type BudgetGoalInput = BudgetGoalInsert;
export type BudgetGoalSelect = BudgetGoal;

// ============================================
// RE-EXPORT STABLE ENUMS AND CONSTANTS
// ============================================

export { TransactionTypeEnum, AccountTypeEnum, TransactionTypes };
export type { TransactionType, BudgetCategoryType };

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

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
} from './finance.schema';

// ============================================
// ZOD SCHEMAS FOR API VALIDATION
// ============================================

export const FinanceAccountSchema = createSelectSchema(financeAccounts);
export const FinanceAccountInsertSchema = createInsertSchema(financeAccounts);
export const FinanceTransactionSchema = createSelectSchema(transactions);
export const TransactionInsertSchema = createInsertSchema(transactions);
export const BudgetCategorySchema = createSelectSchema(budgetCategories);
export const BudgetGoalSchema = createSelectSchema(budgetGoals);
export { TransactionLocationSchema, type TransactionLocation } from './shared.schema';
