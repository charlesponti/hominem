export type InstitutionData = {
  id: string
  name: string
  logo?: string
}

export type BudgetCategoryData = {
  id: string
  name: string
  userId: string
  /**
   * Optional category type. Populated by budget endpoints that
   * compute or infer the type from spending patterns or user config.
   */
  type?: 'income' | 'expense'
  /**
   * Optional colour associated with the category. Stored on the
   * underlying `tags` row and surfaced by most budget endpoints.
   */
  color?: string
  /**
   * User-provided monthly budget amount as a string. Stored as numeric in
   * the database to preserve decimal precision for monetary values. Returned
   * as a string to avoid JavaScript number precision loss. Components parse
   * to number only when needed for calculations.
   */
  averageMonthlyExpense?: string
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other'
export type TransactionType = 'income' | 'expense' | 'transfer'

export type AccountData = {
  id: string
  userId: string
  name: string
  accountType: AccountType
  balance: number
}

export type TransactionData = {
  id: string
  userId: string
  accountId: string
  amount: number
  description: string
  date: string
  type: TransactionType
}

export type AccountWithPlaidInfo = AccountData & {
  institutionName?: string | null
  plaidAccountId?: string | null
  plaidItemId?: string | null
}

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

export type PlaidConnection = {
  id: string
  institutionId: string
  institutionName: string
  institutionLogo: string | null
  status: 'active' | 'error' | 'disconnected'
  lastSynced: string
  accounts: number
}

export type AccountWithPlaidData = AccountData
