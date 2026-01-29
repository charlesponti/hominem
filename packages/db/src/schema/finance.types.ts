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
} from './finance.schema';

// ============================================
// FINANCIAL INSTITUTION TYPES
// ============================================

export type FinancialInstitutionOutput = FinancialInstitution;
export type FinancialInstitutionInput = FinancialInstitutionInsert;

// ============================================
// PLAID ITEM TYPES
// ============================================

export type PlaidItemOutput = PlaidItem;
export type PlaidItemInput = PlaidItemInsert;

// ============================================
// FINANCE ACCOUNT TYPES
// ============================================

export type FinanceAccountOutput = FinanceAccount;
export type FinanceAccountInput = FinanceAccountInsert;

// ============================================
// TRANSACTION TYPES
// ============================================

export type FinanceTransactionOutput = FinanceTransaction;
export type FinanceTransactionInput = FinanceTransactionInsert;

export type TransactionCreatePayload = FinanceTransactionInsert;
export type TransactionUpdatePayload = Omit<FinanceTransactionInsert, 'userId' | 'id' | 'accountId'>;

// ============================================
// BUDGET TYPES
// ============================================

export type BudgetCategoryOutput = BudgetCategory;
export type BudgetCategoryInput = BudgetCategoryInsert;

export type BudgetGoalOutput = BudgetGoal;
export type BudgetGoalInput = BudgetGoalInsert;

// ============================================
// RE-EXPORT STABLE ENUMS
// ============================================

export { TransactionTypeEnum, AccountTypeEnum };
export type { TransactionType, BudgetCategoryType };
