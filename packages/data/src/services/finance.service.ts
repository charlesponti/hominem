import { z } from 'zod'

// Finance schemas exported for cross-package consumption
export const FinanceAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan']),
  balance: z.number(),
  currency: z.string().default('USD'),
  lastUpdated: z.string(),
})

export const createFinanceAccountInputSchema = z.object({
  name: z.string().describe('Name of the account (e.g., "Checking", "Savings")'),
  type: z
    .enum(['checking', 'savings', 'credit', 'investment', 'loan'])
    .describe('Type of financial account'),
  balance: z.number().optional().describe('Initial account balance'),
  currency: z.string().optional().default('USD').describe('Currency code'),
})

export const getFinanceAccountsInputSchema = z.object({
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan']).optional(),
})

export const getFinanceAccountsOutputSchema = z.object({
  accounts: z.array(FinanceAccountSchema),
  total: z.number(),
})

export const updateFinanceAccountInputSchema = z.object({
  accountId: z.string().describe('The ID of the account to update'),
  name: z.string().optional(),
  balance: z.number().optional(),
})

export const deleteFinanceAccountInputSchema = z.object({
  accountId: z.string().describe('The ID of the account to delete'),
})

export const deleteFinanceAccountOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// Transaction schemas
export const TransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  amount: z.number(),
  description: z.string(),
  category: z.string().optional(),
  date: z.string(),
  type: z.enum(['income', 'expense']),
})

export const createTransactionInputSchema = z.object({
  accountId: z.string().describe('The account ID for this transaction'),
  amount: z.number().describe('Transaction amount'),
  description: z.string().describe('Transaction description'),
  type: z.enum(['income', 'expense']).describe('Type of transaction'),
  category: z.string().optional().describe('Transaction category'),
  date: z.string().optional().describe('Transaction date (ISO format)'),
})

export const getTransactionsInputSchema = z.object({
  accountId: z.string().describe('The account ID'),
  from: z.string().optional().describe('Start date (ISO format)'),
  to: z.string().optional().describe('End date (ISO format)'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().optional().describe('Max results to return'),
})

export const getTransactionsOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
  total: z.number(),
})

export const updateTransactionInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID'),
  amount: z.number().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const deleteTransactionInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID to delete'),
})

export const deleteTransactionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// Analytics & Calculators (shapes)
export const CategoryBreakdownSchema = z.object({
  category: z.string(),
  amount: z.number(),
  percentage: z.number(),
  transactionCount: z.number(),
})

export const getSpendingCategoriesInputSchema = z.object({
  from: z.string().optional().describe('Start date (ISO format)'),
  to: z.string().optional().describe('End date (ISO format)'),
})

export const getSpendingCategoriesOutputSchema = z.object({
  categories: z.array(CategoryBreakdownSchema),
  total: z.number(),
})

export const getCategoryBreakdownInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
})

export const getCategoryBreakdownOutputSchema = z.object({
  breakdown: z.array(CategoryBreakdownSchema),
  totalSpending: z.number(),
  averagePerDay: z.number(),
})

export const getSpendingTimeSeriesInputSchema = z.object({
  from: z.string().optional().describe('Start date'),
  to: z.string().optional().describe('End date'),
  groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
  includeStats: z.boolean().optional().default(false),
  compareToPrevious: z.boolean().optional().default(false),
})

export const getSpendingTimeSeriesOutputSchema = z.object({
  series: z.array(
    z.object({
      period: z.string(),
      amount: z.number(),
      transactions: z.number(),
    })
  ),
  total: z.number(),
  average: z.number(),
})

export const getTopMerchantsInputSchema = z.object({
  limit: z.number().optional().default(10),
})

export const getTopMerchantsOutputSchema = z.object({
  merchants: z.array(
    z.object({
      name: z.string(),
      totalSpent: z.number(),
      transactionCount: z.number(),
    })
  ),
})

// Financial Calculators
export const calculateBudgetBreakdownInputSchema = z.object({
  monthlyIncome: z.number().describe('Monthly income'),
  savingsTarget: z.number().optional().describe('Monthly savings goal'),
})

export const calculateBudgetBreakdownOutputSchema = z.object({
  housing: z.number(),
  food: z.number(),
  transportation: z.number(),
  utilities: z.number(),
  healthcare: z.number(),
  entertainment: z.number(),
  savings: z.number(),
})

export const calculateRunwayInputSchema = z.object({
  currentBalance: z.number().describe('Current available balance'),
  monthlyExpenses: z.number().describe('Average monthly expenses'),
})

export const calculateRunwayOutputSchema = z.object({
  months: z.number(),
  days: z.number(),
  estimatedEndDate: z.string(),
})

export const calculateSavingsGoalInputSchema = z.object({
  currentSavings: z.number().describe('Current savings amount'),
  goalAmount: z.number().describe('Target savings amount'),
  monthlyContribution: z.number().describe('Monthly savings contribution'),
  interestRate: z.number().optional().describe('Annual interest rate (%)'),
})

export const calculateSavingsGoalOutputSchema = z.object({
  monthsToGoal: z.number(),
  completionDate: z.string(),
  totalInterestEarned: z.number(),
})

export const calculateLoanDetailsInputSchema = z.object({
  principal: z.number().describe('Loan amount'),
  annualRate: z.number().describe('Annual interest rate (%)'),
  months: z.number().describe('Loan term in months'),
})

export const calculateLoanDetailsOutputSchema = z.object({
  monthlyPayment: z.number(),
  totalPayment: z.number(),
  totalInterest: z.number(),
})

// Minimal FinanceService scaffold
export class FinanceService {
  async createAccount({
    name,
    type,
    balance,
    currency,
  }: z.infer<typeof createFinanceAccountInputSchema>) {
    return {
      id: `${Date.now()}`,
      name,
      type,
      balance: balance ?? 0,
      lastUpdated: new Date().toISOString(),
      currency: currency ?? 'USD',
    }
  }

  async getAccounts(_: z.infer<typeof getFinanceAccountsInputSchema>) {
    return {
      accounts: [],
      total: 0,
    }
  }

  async updateAccount({
    accountId,
    name,
    balance,
  }: z.infer<typeof updateFinanceAccountInputSchema>) {
    return {
      id: accountId,
      name: name ?? 'Account',
      type: 'checking' as const,
      balance: balance ?? 0,
      lastUpdated: new Date().toISOString(),
      currency: 'USD',
    }
  }

  async deleteAccount(_: z.infer<typeof deleteFinanceAccountInputSchema>) {
    return { success: true, message: 'Deleted' }
  }

  async createTransaction(_: z.infer<typeof createTransactionInputSchema>) {
    return {
      id: `${Date.now()}`,
      accountId: 'account-1',
      amount: 0,
      description: '',
      date: new Date().toISOString(),
      type: 'expense' as const,
    }
  }

  async getTransactions(_: z.infer<typeof getTransactionsInputSchema>) {
    return { transactions: [], total: 0 }
  }

  async updateTransaction(_: z.infer<typeof updateTransactionInputSchema>) {
    return {
      id: `${Date.now()}`,
      accountId: 'account-1',
      amount: 0,
      description: '',
      date: new Date().toISOString(),
      type: 'expense' as const,
    }
  }

  async deleteTransaction(_: z.infer<typeof deleteTransactionInputSchema>) {
    return { success: true, message: 'Deleted' }
  }

  async analytics_spendingCategories(_: z.infer<typeof getSpendingCategoriesInputSchema>) {
    return { categories: [], total: 0 }
  }

  async analytics_categoryBreakdown(_: z.infer<typeof getCategoryBreakdownInputSchema>) {
    return { breakdown: [], totalSpending: 0, averagePerDay: 0 }
  }

  async analytics_timeSeries(_: z.infer<typeof getSpendingTimeSeriesInputSchema>) {
    return { series: [], total: 0, average: 0 }
  }

  async analytics_topMerchants(_: z.infer<typeof getTopMerchantsInputSchema>) {
    return { merchants: [] }
  }

  async calculateBudgetBreakdown(_: z.infer<typeof calculateBudgetBreakdownInputSchema>) {
    return {
      housing: 0,
      food: 0,
      transportation: 0,
      utilities: 0,
      healthcare: 0,
      entertainment: 0,
      savings: 0,
    }
  }

  async calculateRunway(_: z.infer<typeof calculateRunwayInputSchema>) {
    return { months: 0, days: 0, estimatedEndDate: new Date().toISOString() }
  }

  async calculateSavingsGoal(_: z.infer<typeof calculateSavingsGoalInputSchema>) {
    return { monthsToGoal: 0, completionDate: new Date().toISOString(), totalInterestEarned: 0 }
  }

  async calculateLoanDetails(_: z.infer<typeof calculateLoanDetailsInputSchema>) {
    return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 }
  }
}

export const financeService = new FinanceService()
