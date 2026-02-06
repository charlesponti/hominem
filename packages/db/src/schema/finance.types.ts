/**
 * Computed Finance Types
 *
 * This file contains all derived types computed from the Finance schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from finance.schema.ts
 */

import type {
  FinancialInstitution,
  FinancialInstitutionInsert,
  FinancialInstitutionSelect,
  PlaidItem,
  PlaidItemInsert,
  PlaidItemSelect,
  FinanceAccount,
  FinanceAccountInsert,
  FinanceAccountSelect,
  FinanceTransaction,
  FinanceTransactionInsert,
  FinanceTransactionSelect,
  BudgetCategory,
  BudgetCategoryInsert,
  BudgetCategorySelect,
  BudgetGoal,
  BudgetGoalInsert,
  BudgetGoalSelect,
  TransactionType,
  AccountType,
  BudgetCategoryType,
} from './finance.schema';

export type {
  FinancialInstitution,
  FinancialInstitutionInsert,
  FinancialInstitutionSelect,
  PlaidItem,
  PlaidItemInsert,
  PlaidItemSelect,
  FinanceAccount,
  FinanceAccountInsert,
  FinanceAccountSelect,
  FinanceTransaction,
  FinanceTransactionInsert,
  FinanceTransactionSelect,
  BudgetCategory,
  BudgetCategoryInsert,
  BudgetCategorySelect,
  BudgetGoal,
  BudgetGoalInsert,
  BudgetGoalSelect,
  TransactionType,
  AccountType,
  BudgetCategoryType,
};

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link FinancialInstitution} instead. This alias will be removed in a future version.
 */
export type FinancialInstitutionOutput = FinancialInstitution;

/**
 * @deprecated Use {@link FinancialInstitutionInsert} instead. This alias will be removed in a future version.
 */
export type FinancialInstitutionInput = FinancialInstitutionInsert;

/**
 * @deprecated Use {@link PlaidItem} instead. This alias will be removed in a future version.
 */
export type PlaidItemOutput = PlaidItem;

/**
 * @deprecated Use {@link PlaidItemInsert} instead. This alias will be removed in a future version.
 */
export type PlaidItemInput = PlaidItemInsert;

/**
 * @deprecated Use {@link FinanceAccount} instead. This alias will be removed in a future version.
 */
export type FinanceAccountOutput = FinanceAccount;

/**
 * @deprecated Use {@link FinanceAccountInsert} instead. This alias will be removed in a future version.
 */
export type FinanceAccountInput = FinanceAccountInsert;

/**
 * @deprecated Use {@link FinanceTransaction} instead. This alias will be removed in a future version.
 */
export type FinanceTransactionOutput = FinanceTransaction;

/**
 * @deprecated Use {@link FinanceTransactionInsert} instead. This alias will be removed in a future version.
 */
export type FinanceTransactionInput = FinanceTransactionInsert;

/**
 * @deprecated Use {@link BudgetCategory} instead. This alias will be removed in a future version.
 */
export type BudgetCategoryOutput = BudgetCategory;

/**
 * @deprecated Use {@link BudgetCategoryInsert} instead. This alias will be removed in a future version.
 */
export type BudgetCategoryInput = BudgetCategoryInsert;

/**
 * @deprecated Use {@link BudgetGoal} instead. This alias will be removed in a future version.
 */
export type BudgetGoalOutput = BudgetGoal;

/**
 * @deprecated Use {@link BudgetGoalInsert} instead. This alias will be removed in a future version.
 */
export type BudgetGoalInput = BudgetGoalInsert;
