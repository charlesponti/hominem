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
export type FinancialInstitutionOutput = FinancialInstitution;
export type FinancialInstitutionInput = FinancialInstitutionInsert;

export type PlaidItemOutput = PlaidItem;
export type PlaidItemInput = PlaidItemInsert;

export type FinanceAccountOutput = FinanceAccount;
export type FinanceAccountInput = FinanceAccountInsert;

export type FinanceTransactionOutput = FinanceTransaction;
export type FinanceTransactionInput = FinanceTransactionInsert;

export type BudgetCategoryOutput = BudgetCategory;
export type BudgetCategoryInput = BudgetCategoryInsert;

export type BudgetGoalOutput = BudgetGoal;
export type BudgetGoalInput = BudgetGoalInsert;
