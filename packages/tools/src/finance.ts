import {
  calculateBudgetBreakdownInputSchema,
  calculateBudgetBreakdownOutputSchema,
  calculateLoanDetailsInputSchema,
  calculateLoanDetailsOutputSchema,
  calculateRunwayInputSchema,
  calculateRunwayOutputSchema,
  calculateSavingsGoalInputSchema,
  calculateSavingsGoalOutputSchema,
  createFinanceAccountInputSchema,
  createTransactionInputSchema,
  deleteFinanceAccountInputSchema,
  deleteFinanceAccountOutputSchema,
  deleteTransactionInputSchema,
  deleteTransactionOutputSchema,
  FinanceAccountSchema,
  getCategoryBreakdownInputSchema,
  getCategoryBreakdownOutputSchema,
  getFinanceAccountsInputSchema,
  getFinanceAccountsOutputSchema,
  getSpendingCategoriesInputSchema,
  getSpendingCategoriesOutputSchema,
  getSpendingTimeSeriesInputSchema,
  getSpendingTimeSeriesOutputSchema,
  getTopMerchantsInputSchema,
  getTopMerchantsOutputSchema,
  getTransactionsInputSchema,
  getTransactionsOutputSchema,
  TransactionSchema,
  updateFinanceAccountInputSchema,
  updateTransactionInputSchema,
} from '@hominem/services/finance'
import { toolDefinition } from '@tanstack/ai'

// Account Tools
export const createFinanceAccountDef = toolDefinition({
  name: 'create_finance_account',
  description: 'Create a new finance account to track money',
  inputSchema: createFinanceAccountInputSchema,
  outputSchema: FinanceAccountSchema,
})

export const getFinanceAccountsDef = toolDefinition({
  name: 'get_finance_accounts',
  description: 'Get all finance accounts for the authenticated user',
  inputSchema: getFinanceAccountsInputSchema,
  outputSchema: getFinanceAccountsOutputSchema,
})

export const updateFinanceAccountDef = toolDefinition({
  name: 'update_finance_account',
  description: 'Update a finance account',
  inputSchema: updateFinanceAccountInputSchema,
  outputSchema: FinanceAccountSchema,
})

export const deleteFinanceAccountDef = toolDefinition({
  name: 'delete_finance_account',
  description: 'Delete a finance account',
  inputSchema: deleteFinanceAccountInputSchema,
  outputSchema: deleteFinanceAccountOutputSchema,
})

export const createTransactionDef = toolDefinition({
  name: 'create_transaction',
  description: 'Record a financial transaction',
  inputSchema: createTransactionInputSchema,
  outputSchema: TransactionSchema,
})

export const getTransactionsDef = toolDefinition({
  name: 'get_transactions',
  description: 'Get transactions for an account',
  inputSchema: getTransactionsInputSchema,
  outputSchema: getTransactionsOutputSchema,
})

export const updateTransactionDef = toolDefinition({
  name: 'update_transaction',
  description: 'Update a transaction',
  inputSchema: updateTransactionInputSchema,
  outputSchema: TransactionSchema,
})

export const deleteTransactionDef = toolDefinition({
  name: 'delete_transaction',
  description: 'Delete a transaction',
  inputSchema: deleteTransactionInputSchema,
  outputSchema: deleteTransactionOutputSchema,
})

export const getSpendingCategoriesDef = toolDefinition({
  name: 'get_spending_categories',
  description: 'Get spending breakdown by category',
  inputSchema: getSpendingCategoriesInputSchema,
  outputSchema: getSpendingCategoriesOutputSchema,
})

export const getCategoryBreakdownDef = toolDefinition({
  name: 'get_category_breakdown',
  description: 'Detailed category spending breakdown',
  inputSchema: getCategoryBreakdownInputSchema,
  outputSchema: getCategoryBreakdownOutputSchema,
})

export const getSpendingTimeSeriesDef = toolDefinition({
  name: 'get_spending_time_series',
  description: 'Get spending over time with trends',
  inputSchema: getSpendingTimeSeriesInputSchema,
  outputSchema: getSpendingTimeSeriesOutputSchema,
})

export const getTopMerchantsDef = toolDefinition({
  name: 'get_top_merchants',
  description: 'Get top merchants by spending',
  inputSchema: getTopMerchantsInputSchema,
  outputSchema: getTopMerchantsOutputSchema,
})

// Financial Calculators
export const calculateBudgetBreakdownDef = toolDefinition({
  name: 'calculate_budget_breakdown',
  description: 'Calculate recommended budget allocation',
  inputSchema: calculateBudgetBreakdownInputSchema,
  outputSchema: calculateBudgetBreakdownOutputSchema,
})

export const calculateRunwayDef = toolDefinition({
  name: 'calculate_runway',
  description: 'Calculate financial runway (how long money will last)',
  inputSchema: calculateRunwayInputSchema,
  outputSchema: calculateRunwayOutputSchema,
})

export const calculateSavingsGoalDef = toolDefinition({
  name: 'calculate_savings_goal_timeline',
  description: 'Calculate timeline to reach a savings goal',
  inputSchema: calculateSavingsGoalInputSchema,
  outputSchema: calculateSavingsGoalOutputSchema,
})

export const calculateLoanDetailsDef = toolDefinition({
  name: 'calculate_loan_details',
  description: 'Calculate loan payment details and schedule',
  inputSchema: calculateLoanDetailsInputSchema,
  outputSchema: calculateLoanDetailsOutputSchema,
})
