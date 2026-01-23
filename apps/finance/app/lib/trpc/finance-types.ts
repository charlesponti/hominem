import type { FinanceRouterOutputs, FinanceRouterInputs } from '@hominem/trpc';

/**
 * Pre-computed finance endpoint output types
 * These help TypeScript avoid re-inferring types repeatedly
 * and provide better IDE autocomplete and performance
 */

// Accounts endpoint types
export type AccountsListOutput = FinanceRouterOutputs['accounts']['list'];
export type AccountsGetOutput = FinanceRouterOutputs['accounts']['get'];
export type AccountsCreateInput = FinanceRouterInputs['accounts']['create'];
export type AccountsCreateOutput = FinanceRouterOutputs['accounts']['create'];
export type AccountsUpdateInput = FinanceRouterInputs['accounts']['update'];
export type AccountsUpdateOutput = FinanceRouterOutputs['accounts']['update'];
export type AccountsDeleteInput = FinanceRouterInputs['accounts']['delete'];
export type AccountsDeleteOutput = FinanceRouterOutputs['accounts']['delete'];
export type AccountsAllOutput = FinanceRouterOutputs['accounts']['all'];
export type AccountsAccountsOutput = FinanceRouterOutputs['accounts']['accounts'];
export type AccountsConnectionsOutput = FinanceRouterOutputs['accounts']['connections'];
export type AccountsInstitutionAccountsInput =
  FinanceRouterInputs['accounts']['institutionAccounts'];
export type AccountsInstitutionAccountsOutput =
  FinanceRouterOutputs['accounts']['institutionAccounts'];

// Institutions endpoint types
export type InstitutionsListOutput = FinanceRouterOutputs['institutions']['list'];
export type InstitutionsCreateInput = FinanceRouterInputs['institutions']['create'];
export type InstitutionsCreateOutput = FinanceRouterOutputs['institutions']['create'];

// Transactions endpoint types
export type TransactionsListInput = FinanceRouterInputs['transactions']['list'];
export type TransactionsListOutput = FinanceRouterOutputs['transactions']['list'];
export type TransactionsGetInput = FinanceRouterInputs['transactions']['get'];
export type TransactionsGetOutput = FinanceRouterOutputs['transactions']['get'];
export type TransactionsCreateInput = FinanceRouterInputs['transactions']['create'];
export type TransactionsCreateOutput = FinanceRouterOutputs['transactions']['create'];
export type TransactionsUpdateInput = FinanceRouterInputs['transactions']['update'];
export type TransactionsUpdateOutput = FinanceRouterOutputs['transactions']['update'];
export type TransactionsDeleteInput = FinanceRouterInputs['transactions']['delete'];
export type TransactionsDeleteOutput = FinanceRouterOutputs['transactions']['delete'];

// Budget endpoint types
export type BudgetCategoriesListOutput = FinanceRouterOutputs['budget']['categories']['list'];
export type BudgetCategoriesCreateInput = FinanceRouterInputs['budget']['categories']['create'];
export type BudgetCategoriesCreateOutput = FinanceRouterOutputs['budget']['categories']['create'];
export type BudgetCategoriesUpdateInput = FinanceRouterInputs['budget']['categories']['update'];
export type BudgetCategoriesUpdateOutput = FinanceRouterOutputs['budget']['categories']['update'];
export type BudgetHistoryInput = FinanceRouterInputs['budget']['history'];
export type BudgetHistoryOutput = FinanceRouterOutputs['budget']['history'];
export type BudgetCalculateInput = FinanceRouterInputs['budget']['calculate'];
export type BudgetCalculateOutput = FinanceRouterOutputs['budget']['calculate'];
export type BudgetTransactionCategoriesOutput =
  FinanceRouterOutputs['budget']['transactionCategories'];

// Analytics endpoint types
export type AnalyzeCategoryBreakdownInput = FinanceRouterInputs['analyze']['categoryBreakdown'];
export type AnalyzeCategoryBreakdownOutput = FinanceRouterOutputs['analyze']['categoryBreakdown'];
export type AnalyzeMonthlyStatsInput = FinanceRouterInputs['analyze']['monthlyStats'];
export type AnalyzeMonthlyStatsOutput = FinanceRouterOutputs['analyze']['monthlyStats'];
export type AnalyzeSpendingTimeSeriesInput = FinanceRouterInputs['analyze']['spendingTimeSeries'];
export type AnalyzeSpendingTimeSeriesOutput = FinanceRouterOutputs['analyze']['spendingTimeSeries'];
export type AnalyzeTopMerchantsInput = FinanceRouterInputs['analyze']['topMerchants'];
export type AnalyzeTopMerchantsOutput = FinanceRouterOutputs['analyze']['topMerchants'];

// Categories endpoint types
export type CategoriesListOutput = FinanceRouterOutputs['categories']['list'];

// Export endpoint types
export type ExportTransactionsInput = FinanceRouterInputs['export']['transactions'];
export type ExportTransactionsOutput = FinanceRouterOutputs['export']['transactions'];
