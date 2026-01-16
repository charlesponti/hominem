/**
 * Available Tools with Server Implementations
 * Uses TanStack AI tool definitions exclusively
 */

import { financeService } from '@hominem/data/finance'
import { mentalHealthService, workoutService } from '@hominem/data/health'
import { notesService } from '@hominem/data/notes'
import {
  assessMentalWellnessDef,
  calculateBudgetBreakdownDef,
  calculateLoanDetailsDef,
  calculateRunwayDef,
  calculateSavingsGoalDef,
  createFinanceAccountDef,
  createNoteDef,
  createTransactionDef,
  deleteFinanceAccountDef,
  deleteTransactionDef,
  getCategoryBreakdownDef,
  getFinanceAccountsDef,
  getSpendingCategoriesDef,
  getSpendingTimeSeriesDef,
  getTopMerchantsDef,
  getTransactionsDef,
  listNotesDef,
  recommendWorkoutDef,
  updateFinanceAccountDef,
  updateTransactionDef,
} from '@hominem/tools'

/**
 * Export TanStack AI tools with server implementations
 * Each tool is set up with its `.server()` implementation for execution
 */
export const getAvailableTools = (userId: string) => [
  // Notes
  createNoteDef.server((input: unknown) => {
    const args = input as {
      title: string
      content: string
      tags: { value: string }[]
      type: 'note' | 'task' | 'timer' | 'journal' | 'document'
    }
    return notesService.create({ ...args, userId }) as any
  }),
  listNotesDef.server((input: unknown) => {
    const args = input as {
      limit: number
      offset: number
      types?: string[]
      query?: string
      tags?: string[]
      since?: string
    }
    return notesService.query(userId, args) as any
  }),

  // Finance Accounts
  createFinanceAccountDef.server((input: unknown) => {
    const args = input as {
      name: string
      type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan'
      balance: number
      currency: string
    }
    return financeService.createAccount(args)
  }),
  getFinanceAccountsDef.server((input: unknown) =>
    financeService.getAccounts(
      input as { type?: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' }
    )
  ),

  updateFinanceAccountDef.server((input: unknown) =>
    financeService.updateAccount(input as { accountId: string; name?: string; balance?: number })
  ),

  deleteFinanceAccountDef.server((input: unknown) =>
    financeService.deleteAccount(input as { accountId: string })
  ),

  // Finance Transactions
  createTransactionDef.server((input: unknown) =>
    financeService.createTransaction(
      input as {
        accountId: string
        amount: number
        description: string
        type: 'income' | 'expense'
        category?: string
        date?: string
      }
    )
  ),

  getTransactionsDef.server((input: unknown) =>
    financeService.getTransactions(
      input as { accountId: string; from?: string; to?: string; category?: string; limit?: number }
    )
  ),

  updateTransactionDef.server((input: unknown) =>
    financeService.updateTransaction(
      input as { transactionId: string; amount?: number; description?: string; category?: string }
    )
  ),

  deleteTransactionDef.server((input: unknown) =>
    financeService.deleteTransaction(input as { transactionId: string })
  ),

  // Finance Analytics
  getSpendingCategoriesDef.server((input: unknown) =>
    financeService.analytics_spendingCategories(input as { from?: string; to?: string })
  ),
  getCategoryBreakdownDef.server((input: unknown) =>
    financeService.analytics_categoryBreakdown(
      input as { from?: string; to?: string; category?: string }
    )
  ),
  getSpendingTimeSeriesDef.server((input: unknown) =>
    financeService.analytics_timeSeries(
      input as {
        groupBy: 'month' | 'week' | 'day'
        includeStats: boolean
        compareToPrevious: boolean
        from?: string
        to?: string
      }
    )
  ),
  getTopMerchantsDef.server((input: unknown) =>
    financeService.analytics_topMerchants(input as { limit: number })
  ),

  // Finance Calculators
  calculateBudgetBreakdownDef.server((input: unknown) =>
    financeService.calculateBudgetBreakdown(
      input as { monthlyIncome: number; savingsTarget?: number }
    )
  ),
  calculateRunwayDef.server((input: unknown) =>
    financeService.calculateRunway(input as { currentBalance: number; monthlyExpenses: number })
  ),
  calculateSavingsGoalDef.server((input: unknown) =>
    financeService.calculateSavingsGoal(
      input as {
        currentSavings: number
        goalAmount: number
        monthlyContribution: number
        interestRate?: number
      }
    )
  ),
  calculateLoanDetailsDef.server((input: unknown) =>
    financeService.calculateLoanDetails(
      input as { principal: number; annualRate: number; months: number }
    )
  ),
  // Wellness
  recommendWorkoutDef.server((input: unknown) =>
    workoutService.recommend(
      input as {
        fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
        goal: 'strength' | 'endurance' | 'weight_loss' | 'muscle_gain' | 'general_fitness'
        timeAvailable: number
        equipment?: string[]
        limitations?: string[]
      }
    )
  ),
  assessMentalWellnessDef.server((input: unknown) =>
    mentalHealthService.assess(
      input as {
        stressDescription: string
        moodRating: number
        recentChallenges?: string[]
        currentCopingStrategies?: string[]
      }
    )
  ),
]
