import { FinanceAccountSchema } from '@hominem/db/schema';
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import type { FinanceAccountInsert } from './finance.types';

import { calculateTransactions } from './analytics/transaction-analytics.service';
import { createAccount, deleteAccount, listAccounts, updateAccount } from './core/account.service';
import { type BudgetCategoryType, getBudgetCategories } from './core/budget-categories.service';
import {
  getCategoryBreakdown,
  getCategoryBreakdownInputSchema,
  getCategoryBreakdownOutputSchema,
  getSpendingTimeSeries,
  getSpendingTimeSeriesInputSchema,
  getSpendingTimeSeriesOutputSchema,
  getTopMerchants,
  getTopMerchantsInputSchema,
  getTopMerchantsOutputSchema,
} from './finance.analytics.service';
import {
  calculateBudgetBreakdown,
  calculateBudgetBreakdownInputSchema,
  calculateBudgetBreakdownOutputSchema,
  calculateLoanDetails,
  calculateLoanDetailsInputSchema,
  calculateLoanDetailsOutputSchema,
  calculateRunway,
  calculateRunwayInputSchema,
  calculateRunwayOutputSchema,
  calculateSavingsGoal,
  calculateSavingsGoalInputSchema,
  calculateSavingsGoalOutputSchema,
} from './finance.calculators.service';
import {
  createFinanceAccountInputSchema,
  deleteFinanceAccountInputSchema,
  deleteFinanceAccountOutputSchema,
  getFinanceAccountsInputSchema,
  getFinanceAccountsOutputSchema,
  updateFinanceAccountInputSchema,
} from './finance.schemas';
import {
  createTransaction,
  createTransactionInputSchema,
  createTransactionOutputSchema,
  deleteTransaction,
  deleteTransactionInputSchema,
  deleteTransactionOutputSchema,
  getTransactions,
  getTransactionsInputSchema,
  getTransactionsOutputSchema,
  updateTransaction,
  updateTransactionInputSchema,
  updateTransactionOutputSchema,
} from './finance.transactions.service';

// Accounts
export const createFinanceAccountDef = toolDefinition({
  name: 'create_finance_account',
  description: 'Create a new finance account to track money',
  inputSchema: createFinanceAccountInputSchema,
  outputSchema: FinanceAccountSchema,
});

export const createFinanceAccountServer =
  (userId: string) =>
  async (
    input: z.infer<typeof createFinanceAccountInputSchema>,
  ): Promise<Awaited<ReturnType<typeof createAccount>>> => {
    const payload: Omit<FinanceAccountInsert, 'id'> = {
      name: input.name,
      type: input.type,
      balance: input.balance !== undefined ? input.balance.toString() : '0',
      isoCurrencyCode: input.currency ?? 'USD',
      userId,
    };
    return createAccount(payload);
  };

export const getFinanceAccountsDef = toolDefinition({
  name: 'get_finance_accounts',
  description: 'Get all finance accounts for the authenticated user',
  inputSchema: getFinanceAccountsInputSchema,
  outputSchema: getFinanceAccountsOutputSchema,
});

export const getFinanceAccountsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getFinanceAccountsInputSchema>,
  ): Promise<{ accounts: Awaited<ReturnType<typeof listAccounts>>; total: number }> => {
    const accounts = await listAccounts(userId);
    const filtered = input.type ? accounts.filter((a) => a.type === input.type) : accounts;
    return { accounts: filtered, total: filtered.length };
  };

export const updateFinanceAccountDef = toolDefinition({
  name: 'update_finance_account',
  description: 'Update a finance account',
  inputSchema: updateFinanceAccountInputSchema,
  outputSchema: FinanceAccountSchema,
});

export const updateFinanceAccountServer =
  (userId: string) => async (input: z.infer<typeof updateFinanceAccountInputSchema>) => {
    const { accountId, balance, ...updates } = input;
    const payload: Parameters<typeof updateAccount>[2] = { ...updates };
    if (balance !== undefined) {
      payload.balance = balance.toString();
    }
    return updateAccount(accountId, userId, payload);
  };

export const deleteFinanceAccountDef = toolDefinition({
  name: 'delete_finance_account',
  description: 'Delete a finance account',
  inputSchema: deleteFinanceAccountInputSchema,
  outputSchema: deleteFinanceAccountOutputSchema,
});

export const deleteFinanceAccountServer =
  (userId: string) =>
  async (
    input: z.infer<typeof deleteFinanceAccountInputSchema>,
  ): Promise<z.infer<typeof deleteFinanceAccountOutputSchema>> => {
    await deleteAccount(input.accountId, userId);
    return { success: true, message: 'Account deleted successfully' };
  };

// Transactions
export const createTransactionDef = toolDefinition({
  name: 'create_transaction',
  description: 'Record a financial transaction',
  inputSchema: createTransactionInputSchema,
  outputSchema: createTransactionOutputSchema,
});

export const createTransactionServer =
  (userId: string) =>
  async (
    input: z.infer<typeof createTransactionInputSchema>,
  ): Promise<z.infer<typeof createTransactionOutputSchema>> =>
    createTransaction(input, userId);

export const getTransactionsDef = toolDefinition({
  name: 'get_transactions',
  description: 'Get transactions for an account',
  inputSchema: getTransactionsInputSchema,
  outputSchema: getTransactionsOutputSchema,
});

export const getTransactionsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getTransactionsInputSchema>,
  ): Promise<z.infer<typeof getTransactionsOutputSchema>> =>
    getTransactions(input, userId);

export const updateTransactionDef = toolDefinition({
  name: 'update_transaction',
  description: 'Update a transaction',
  inputSchema: updateTransactionInputSchema,
  outputSchema: updateTransactionOutputSchema,
});

export const updateTransactionServer =
  (userId: string) =>
  async (
    input: z.infer<typeof updateTransactionInputSchema>,
  ): Promise<z.infer<typeof updateTransactionOutputSchema>> =>
    updateTransaction(input, userId);

export const deleteTransactionDef = toolDefinition({
  name: 'delete_transaction',
  description: 'Delete a transaction',
  inputSchema: deleteTransactionInputSchema,
  outputSchema: deleteTransactionOutputSchema,
});

export const deleteTransactionServer =
  (userId: string) =>
  async (
    input: z.infer<typeof deleteTransactionInputSchema>,
  ): Promise<z.infer<typeof deleteTransactionOutputSchema>> =>
    deleteTransaction(input, userId);

export const getSpendingCategoriesDef = toolDefinition({
  name: 'get_spending_categories',
  description: 'Get spending breakdown by category',
  inputSchema: getSpendingTimeSeriesInputSchema,
  outputSchema: getSpendingTimeSeriesOutputSchema,
});

export const getSpendingCategoriesServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getSpendingTimeSeriesInputSchema>,
  ): Promise<z.infer<typeof getSpendingTimeSeriesOutputSchema>> =>
    getSpendingTimeSeries(userId, input);

export const getCategoryBreakdownDef = toolDefinition({
  name: 'get_category_breakdown',
  description: 'Detailed category spending breakdown',
  inputSchema: getCategoryBreakdownInputSchema,
  outputSchema: getCategoryBreakdownOutputSchema,
});

export const getCategoryBreakdownServer =
  (userId: string) => async (input: z.infer<typeof getCategoryBreakdownInputSchema>) => {
    return getCategoryBreakdown(userId, input);
  };

export const getSpendingTimeSeriesDef = toolDefinition({
  name: 'get_spending_time_series',
  description: 'Get spending over time with trends',
  inputSchema: getSpendingTimeSeriesInputSchema,
  outputSchema: getSpendingTimeSeriesOutputSchema,
});

export const getSpendingTimeSeriesServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getSpendingTimeSeriesInputSchema>,
  ): Promise<z.infer<typeof getSpendingTimeSeriesOutputSchema>> =>
    getSpendingTimeSeries(userId, input);

export const getTopMerchantsDef = toolDefinition({
  name: 'get_top_merchants',
  description: 'Get top merchants by spending',
  inputSchema: getTopMerchantsInputSchema,
  outputSchema: getTopMerchantsOutputSchema,
});

export const getTopMerchantsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getTopMerchantsInputSchema>,
  ): Promise<z.infer<typeof getTopMerchantsOutputSchema>> =>
    getTopMerchants(userId, input);

// Calculators
export const calculateBudgetBreakdownDef = toolDefinition({
  name: 'calculate_budget_breakdown',
  description: 'Calculate recommended budget allocation',
  inputSchema: calculateBudgetBreakdownInputSchema,
  outputSchema: calculateBudgetBreakdownOutputSchema,
});

export const calculateBudgetBreakdownServer =
  (_userId: string) => async (input: z.infer<typeof calculateBudgetBreakdownInputSchema>) =>
    calculateBudgetBreakdown(input);

export const calculateRunwayDef = toolDefinition({
  name: 'calculate_runway',
  description: 'Calculate financial runway (how long money will last)',
  inputSchema: calculateRunwayInputSchema,
  outputSchema: calculateRunwayOutputSchema,
});

export const calculateRunwayServer =
  (_userId: string) => async (input: z.infer<typeof calculateRunwayInputSchema>) =>
    calculateRunway(input);

export const calculateSavingsGoalDef = toolDefinition({
  name: 'calculate_savings_goal_timeline',
  description: 'Calculate timeline to reach a savings goal',
  inputSchema: calculateSavingsGoalInputSchema,
  outputSchema: calculateSavingsGoalOutputSchema,
});

export const calculateSavingsGoalServer =
  (_userId: string) => async (input: z.infer<typeof calculateSavingsGoalInputSchema>) =>
    calculateSavingsGoal(input);

export const calculateLoanDetailsDef = toolDefinition({
  name: 'calculate_loan_details',
  description: 'Calculate loan payment details and schedule',
  inputSchema: calculateLoanDetailsInputSchema,
  outputSchema: calculateLoanDetailsOutputSchema,
});

export const calculateLoanDetailsServer =
  (_userId: string) => async (input: z.infer<typeof calculateLoanDetailsInputSchema>) =>
    calculateLoanDetails(input);

// Budget Categories
export const getBudgetCategoriesInputSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
});

export const getBudgetCategoriesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    averageMonthlyExpense: z.string().nullable(),
  }),
);

export const getBudgetCategoriesDef = toolDefinition({
  name: 'get_budget_categories',
  description: 'A tool to get budget categories by name or type.',
  inputSchema: getBudgetCategoriesInputSchema,
  outputSchema: getBudgetCategoriesOutputSchema,
});

export const getBudgetCategoriesServer =
  (userId: string) => async (input: z.infer<typeof getBudgetCategoriesInputSchema>) => {
    const categories = await getBudgetCategories({
      userId: userId,
      name: input.name,
      type: input.type as BudgetCategoryType | undefined,
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      averageMonthlyExpense: category.averageMonthlyExpense,
    }));
  };

// Calculate Transactions
export const calculateTransactionsInputSchema = z.object({
  calculationType: z
    .enum(['sum', 'average', 'count', 'stats'])
    .describe('Type of calculation to perform (sum, average, count, stats)'),
  from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  to: z.string().optional().describe('End date (YYYY-MM-DD)'),
  type: z
    .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
    .optional()
    .describe('Filter by transaction type'),
  category: z.string().optional().describe('Filter by category'),
  account: z.string().optional().describe('Filter by account ID'),
  descriptionLike: z
    .string()
    .optional()
    .describe('Filter transactions where description contains this text'),
});

export const calculateTransactionsOutputSchema = z.object({
  calculationResult: z.any(),
  message: z.string(),
});

export const calculateTransactionsDef = toolDefinition({
  name: 'calculate_transactions',
  description:
    'Calculate aggregate values (sum, average, count) for transactions based on filters.',
  inputSchema: calculateTransactionsInputSchema,
  outputSchema: calculateTransactionsOutputSchema,
});

export const calculateTransactionsServer =
  (userId: string) => async (input: z.infer<typeof calculateTransactionsInputSchema>) => {
    const { calculationType, ...filters } = input;
    const result = await calculateTransactions({ userId, ...filters, calculationType });

    let value: number | object = 0;
    if ('value' in result) {
      value = result.value;
    } else {
      switch (calculationType) {
        case 'sum':
          value = Number.parseFloat(result.total);
          break;
        case 'average':
          value = Number.parseFloat(result.average);
          break;
        case 'count':
          value = result.count;
          break;
        default:
          return { calculationResult: result, message: 'Calculated statistics for filters.' };
      }
    }

    return { calculationResult: value, message: `Calculated ${calculationType}: ${value}` };
  };

export const tools = {
  create_finance_account: createFinanceAccountDef,
  get_finance_accounts: getFinanceAccountsDef,
  update_finance_account: updateFinanceAccountDef,
  delete_finance_account: deleteFinanceAccountDef,
  create_transaction: createTransactionDef,
  get_transactions: getTransactionsDef,
  update_transaction: updateTransactionDef,
  delete_transaction: deleteTransactionDef,
  get_spending_categories: getSpendingCategoriesDef,
  get_category_breakdown: getCategoryBreakdownDef,
  get_spending_time_series: getSpendingTimeSeriesDef,
  get_top_merchants: getTopMerchantsDef,
  calculate_budget_breakdown: calculateBudgetBreakdownDef,
  calculate_runway: calculateRunwayDef,
  calculate_savings_goal_timeline: calculateSavingsGoalDef,
  calculate_loan_details: calculateLoanDetailsDef,
  get_budget_categories: getBudgetCategoriesDef,
  calculate_transactions: calculateTransactionsDef,
};
