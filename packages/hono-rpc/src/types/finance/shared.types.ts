/**
 * Finance Shared Data Types
 *
 * Common data structures used across all finance domains:
 * - Institution data
 * - Time series data and statistics
 * - Budget category data
 * - Account data and variants
 * - Transaction data
 */

import type {
  AccountWithPlaidInfo as AccountWithPlaidInfoSchema,
  BudgetCategory,
  FinanceAccount,
  FinanceTransaction,
  FinancialInstitution,
} from '../../schemas/finance.schema'

export type InstitutionData = FinancialInstitution

// ============================================================================
// Named Types for TimeSeriesDataPoint
// ============================================================================

export type TimeSeriesTrend = {
  raw: string
  formatted: string
  direction: 'up' | 'down' | 'flat'
  percentChange?: string
  previousAmount?: number
  formattedPreviousAmount?: string
  percentChangeExpenses?: string
  rawExpenses?: string
  previousExpenses?: number
  formattedPreviousExpenses?: string
  directionExpenses?: 'up' | 'down'
}

export type TimeSeriesDataPoint = {
  date: string
  amount: number
  expenses: number
  income: number
  count: number
  average: number
  trend?: TimeSeriesTrend
  formattedAmount?: string
  formattedIncome?: string
  formattedExpenses?: string
}

export type TimeSeriesStats = {
  total: number
  average: number
  min: number
  max: number
  trend: 'up' | 'down' | 'stable'
  changePercentage: number
  periodCovered?: string
  totalIncome?: number
  totalExpenses?: number
  averageIncome?: number
  averageExpenses?: number
  count?: number
}

export type BudgetCategoryData = BudgetCategory

export type AccountData = FinanceAccount

export type PlaidConnection = {
  id: string
  institutionId: string
  institutionName: string
  institutionLogo: string | null
  status: 'active' | 'error' | 'disconnected'
  lastSynced: string
  accounts: number
}

/**
 * Account with Plaid metadata
 * Currently just an alias to AccountData since Plaid properties aren't part of the DB schema
 * This type exists for future expansion when Plaid sync metadata is added
 */
export type AccountWithPlaidData = AccountData

export type AccountWithPlaidInfo = AccountWithPlaidInfoSchema

export type TransactionData = FinanceTransaction
