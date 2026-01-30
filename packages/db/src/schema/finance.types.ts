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
  type AccountType,
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

export { type FinancialInstitution as FinancialInstitutionOutput };
export { type FinancialInstitutionInsert as FinancialInstitutionInput };
export { type FinancialInstitution as FinancialInstitutionSelect };

// ============================================
// PLAID ITEM TYPES
// ============================================

export { type PlaidItem as PlaidItemOutput };
export { type PlaidItemInsert as PlaidItemInput };
export { type PlaidItem as PlaidItemSelect };

// ============================================
// FINANCE ACCOUNT TYPES
// ============================================

export { type FinanceAccount as FinanceAccountOutput };
export { type FinanceAccountInsert as FinanceAccountInput };
export { type FinanceAccount as FinanceAccountSelect };

// ============================================
// TRANSACTION TYPES
// ============================================

export { type FinanceTransaction as FinanceTransactionOutput };
export { type FinanceTransactionInsert as FinanceTransactionInput };
export { type FinanceTransaction as FinanceTransactionSelect };

export { type FinanceTransactionInsert as TransactionCreatePayload };
export type TransactionUpdatePayload = Omit<FinanceTransactionInsert, 'userId' | 'id' | 'accountId'>;

// ============================================
// BUDGET TYPES
// ============================================

export { type BudgetCategory as BudgetCategoryOutput };
export { type BudgetCategoryInsert as BudgetCategoryInput };
export { type BudgetCategory as BudgetCategorySelect };

export { type BudgetGoal as BudgetGoalOutput };
export { type BudgetGoalInsert as BudgetGoalInput };
export { type BudgetGoal as BudgetGoalSelect };

// ============================================
// RE-EXPORT STABLE ENUMS AND CONSTANTS
// ============================================

export { TransactionTypeEnum, AccountTypeEnum, TransactionTypes };
export type { TransactionType, AccountType, BudgetCategoryType };

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
