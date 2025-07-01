// Base budget category with proper typing
export interface BudgetCategoryBase {
  id: string
  name: string
  type: 'income' | 'expense'
  budgetId: string | null
  averageMonthlyExpense: string | null
  userId: string
}

// Budget category with calculated spending data and UI properties
export interface BudgetCategoryWithSpending extends BudgetCategoryBase {
  actualSpending: number
  percentageSpent: number
  budgetAmount: number // Parsed from averageMonthlyExpense
  variance: number // budgetAmount - actualSpending
  remaining: number // budgetAmount - actualSpending (positive if under budget)
  // UI properties
  color: string
  status: 'on-track' | 'warning' | 'over-budget'
  statusColor: string
}

// Budget summary data
export interface BudgetSummary {
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  budgetUsagePercentage: number
  isOverBudget: boolean
  categories: BudgetCategoryWithSpending[]
}

// Budget tracking data for a specific month
export interface BudgetTrackingData {
  monthYear: string
  summary: BudgetSummary
  categories: BudgetCategoryWithSpending[]
  chartData: BudgetChartData[]
  pieData: BudgetPieData[]
}

// Chart data for budget vs actual comparison
export interface BudgetChartData {
  name: string
  fullName: string
  budgeted: number
  actual: number
  variance: number
}

// Pie chart data for spending distribution
export interface BudgetPieData {
  name: string
  value: number
  fill: string
}

// Historical budget data
export interface BudgetHistoryData {
  date: string
  budgeted: number
  actual: number
}
