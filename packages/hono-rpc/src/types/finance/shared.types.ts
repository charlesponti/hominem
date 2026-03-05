export type InstitutionData = {
  id: string
  name: string
  logo?: string | null
}

export type BudgetCategoryData = {
  id: string
  name: string
  userId: string
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
