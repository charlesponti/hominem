'use client'

import { useApiClient } from '@hominem/ui'
import type { BudgetCategory } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useMonthlyStats } from './use-monthly-stats'

const BUDGET_DATA_KEY_PREFIX = 'budget_data'

// Utility type for budget category creation
type BudgetCategoryCreation = Omit<BudgetCategory, 'id' | 'userId' | 'budgetId'> & {
  allocatedAmount: number
  budgetId?: string
}

// Utility type for budget category update
type BudgetCategoryUpdate = Partial<Omit<BudgetCategory, 'userId' | 'budgetId'>> & {
  id: string
  allocatedAmount?: number
  budgetId?: string
}

export function useBudgetCategories() {
  const api = useApiClient()

  const queryKey = ['budget_data', 'categories', 'user']

  const query = useQuery<BudgetCategory[], Error>({
    queryKey,
    queryFn: async () => {
      return await api.get<never, BudgetCategory[]>('/api/finance/budget/categories')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  return {
    categories: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCreateBudgetCategory() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation<BudgetCategory, Error, BudgetCategoryCreation>({
    mutationFn: async (newCategoryData) => {
      const payload = {
        name: newCategoryData.name,
        type: newCategoryData.type,
        allocatedAmount: Number(newCategoryData.allocatedAmount),
        budgetId: newCategoryData.budgetId,
        averageMonthlyExpense: String(newCategoryData.allocatedAmount),
      }
      return await api.post<BudgetCategoryCreation, BudgetCategory>(
        '/api/finance/budget/categories',
        payload
      )
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['budget_data', 'categories', 'user'] })
    },
    onError: (err) => setError(err),
  })

  return {
    createCategory: mutation.mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error || error,
    isSuccess: mutation.isSuccess,
  }
}

export function useUpdateBudgetCategory() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation<BudgetCategory, Error, BudgetCategoryUpdate>({
    mutationFn: async (categoryUpdateData) => {
      const { id, ...updateData } = categoryUpdateData
      const payload: Record<string, unknown> = { ...updateData }
      if (updateData.allocatedAmount !== undefined) {
        payload.allocatedAmount = Number(updateData.allocatedAmount)
      }
      return await api.put<typeof payload, BudgetCategory>(
        `/api/finance/budget/categories/${id}`,
        payload
      )
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget_data', 'categories', 'user'] })
      queryClient.invalidateQueries({
        queryKey: ['budget_data', 'categories', variables.id, 'user'],
      })
    },
    onError: (err) => setError(err),
  })

  return {
    updateCategory: mutation.mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error || error,
    isSuccess: mutation.isSuccess,
  }
}

export function useDeleteBudgetCategory() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  const mutation = useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (categoryId) => {
      return await api.delete<never, { success: boolean; message: string }>(
        `/api/finance/budget/categories/${categoryId}`
      )
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['budget_data', 'categories', 'user'] })
    },
  })

  return {
    deleteCategory: mutation.mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

interface BudgetHistoryDataPoint {
  date: string
  budgeted: number
  actual: number
}

export function useBudgetHistory(months = 6) {
  const api = useApiClient()
  const queryKey = ['budget_data', 'history', months, 'user']

  const query = useQuery<BudgetHistoryDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      return await api.get<never, BudgetHistoryDataPoint[]>(
        `/api/finance/budget/history?months=${months}`
      )
    },
    staleTime: 15 * 60 * 1000,
  })

  return {
    historyData: query.data,
    isLoadingHistory: query.isLoading,
    errorHistory: query.error,
    refetchHistory: query.refetch,
  }
}

// Personal budget calculation types
export type PersonalBudgetInput = {
  income: number
  expenses: Array<{
    category: string
    amount: number
  }>
}

export type PersonalBudgetResult = {
  income: number
  totalExpenses: number
  surplus: number
  savingsRate: number
  categories: Array<{
    category: string
    amount: number
    percentage: number
  }>
  projections: Array<{
    month: number
    savings: number
    totalSaved: number
  }>
  calculatedAt: string
  source: 'manual' | 'categories'
}

// Hook for personal budget calculation
export function usePersonalBudgetCalculation() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  const calculateBudget = useMutation<PersonalBudgetResult, Error, PersonalBudgetInput | undefined>(
    {
      mutationFn: async (manualData) => {
        return await api.post<PersonalBudgetInput | undefined, PersonalBudgetResult>(
          '/api/finance/budget/calculate',
          manualData
        )
      },
      onSuccess: () => {
        // Optionally invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['budget_data'] })
      },
    }
  )

  return {
    calculateBudget,
    isLoading: calculateBudget.isLoading,
    isError: calculateBudget.isError,
    error: calculateBudget.error,
    data: calculateBudget.data,
  }
}

// Hook for budget vs actual analysis
export function useBudgetVsActual(monthYear?: string) {
  const { categories } = useBudgetCategories()
  const { stats: actualSpending, isLoading: statsLoading } = useMonthlyStats(
    monthYear || new Date().toISOString().slice(0, 7)
  )

  const budgetVsActual = useMemo(() => {
    if (!categories || !actualSpending) return []

    return categories
      .filter((cat) => cat.type === 'expense')
      .map((category) => {
        const budgetedAmount = Number.parseFloat(category.averageMonthlyExpense || '0')
        const actualAmount =
          actualSpending.categorySpending?.find(
            (spending: { name: string | null; amount: number }) => spending.name === category.name
          )?.amount || 0

        const variance = actualAmount - budgetedAmount
        const percentageUsed = budgetedAmount > 0 ? (actualAmount / budgetedAmount) * 100 : 0

        return {
          ...category,
          budgetedAmount,
          actualAmount,
          variance,
          percentageUsed,
          isOverBudget: variance > 0,
          status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good',
        }
      })
  }, [categories, actualSpending])

  const totals = useMemo(() => {
    const totalBudgeted = budgetVsActual.reduce((sum, item) => sum + item.budgetedAmount, 0)
    const totalActual = budgetVsActual.reduce((sum, item) => sum + item.actualAmount, 0)
    const totalVariance = totalActual - totalBudgeted

    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      overallPercentage: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0,
    }
  }, [budgetVsActual])

  return {
    budgetVsActual,
    totals,
    isLoading: !categories || statsLoading,
  }
}

interface TransactionCategory {
  name: string
  transactionCount: number
  totalAmount: number
  averageAmount: number
  suggestedBudget: number
}

interface BulkCreateFromTransactionsInput {
  categories: Array<{
    name: string
    type: 'income' | 'expense'
    allocatedAmount?: number
  }>
}

export function useTransactionCategories() {
  const api = useApiClient()
  const queryKey = ['budget_data', 'transaction-categories', 'user']

  const query = useQuery<TransactionCategory[], Error>({
    queryKey,
    queryFn: async () => {
      return await api.get<never, TransactionCategory[]>(
        '/api/finance/budget/transaction-categories'
      )
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    categories: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useBulkCreateFromTransactions() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation<
    {
      success: boolean
      message: string
      categories: BudgetCategory[]
      created: number
      skipped: number
    },
    Error,
    BulkCreateFromTransactionsInput
  >({
    mutationFn: async (data) => {
      return await api.post<
        BulkCreateFromTransactionsInput,
        {
          success: boolean
          message: string
          categories: BudgetCategory[]
          created: number
          skipped: number
        }
      >('/api/finance/budget/bulk-create-from-transactions', data)
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['budget_data', 'categories', 'user'] })
      queryClient.invalidateQueries({
        queryKey: ['budget_data', 'transaction-categories', 'user'],
      })
    },
    onError: (err) => setError(err),
  })

  return {
    bulkCreate: mutation.mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error || error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  }
}
