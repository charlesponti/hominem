import { useQuery } from '@tanstack/react-query'
import type { TRPCClientErrorLike } from '@trpc/client'
import { useState } from 'react'
import { trpc } from '~/lib/trpc'

const BUDGET_DATA_KEY_PREFIX = 'budget_data'

// Utility type for budget category creation
type BudgetCategoryCreation = {
  name: string
  type: 'income' | 'expense'
  allocatedAmount: number
  budgetId?: string
}

// Utility type for budget category update
type BudgetCategoryUpdate = {
  id: string
  name?: string
  type?: 'income' | 'expense'
  allocatedAmount?: number
  budgetId?: string
}

// Type for budget vs actual analysis result
interface BudgetVsActualItem {
  id: string
  name: string
  type: string
  averageMonthlyExpense: string | null
  userId: string
  budgetId: string | null
  createdAt: string
  updatedAt: string
  budgetedAmount: number
  actualAmount: number
  variance: number
  percentageUsed: number
  isOverBudget: boolean
  status: 'over' | 'warning' | 'good'
}

export function useBudgetCategories() {
  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = trpc.finance.budget.categories.list.useQuery()

  return {
    categories,
    isLoading,
    error,
    refetch,
  }
}

export function useCreateBudgetCategory() {
  const utils = trpc.useUtils()
  const [error, setError] = useState<TRPCClientErrorLike<any> | null>(null)

  const mutation = trpc.finance.budget.categories.create.useMutation({
    onSuccess: () => {
      utils.finance.budget.categories.list.invalidate()
    },
    onError: (err) => setError(err),
  })

  const createCategory = async (newCategoryData: BudgetCategoryCreation) => {
    const payload = {
      name: newCategoryData.name,
      type: newCategoryData.type as 'income' | 'expense',
      allocatedAmount: newCategoryData.allocatedAmount,
      budgetId: newCategoryData.budgetId,
    }
    return await mutation.mutateAsync(payload)
  }

  return {
    createCategory,
    isLoading: mutation.isPending,
    error: mutation.error || error,
    isSuccess: mutation.isSuccess,
  }
}

export function useUpdateBudgetCategory() {
  const utils = trpc.useUtils()
  const [error, setError] = useState<TRPCClientErrorLike<any> | null>(null)

  const mutation = trpc.finance.budget.categories.update.useMutation({
    onSuccess: () => {
      utils.finance.budget.categories.list.invalidate()
    },
    onError: (err) => setError(err),
  })

  const updateCategory = async (categoryUpdateData: BudgetCategoryUpdate) => {
    const { id, ...updateData } = categoryUpdateData
    const payload: any = { id, ...updateData }
    if (updateData.type) {
      payload.type = updateData.type as 'income' | 'expense'
    }
    return await mutation.mutateAsync(payload)
  }

  return {
    updateCategory,
    isLoading: mutation.isPending,
    error: mutation.error || error,
    isSuccess: mutation.isSuccess,
  }
}

export function useDeleteBudgetCategory() {
  const utils = trpc.useUtils()

  const mutation = trpc.finance.budget.categories.delete.useMutation({
    onSuccess: () => {
      utils.finance.budget.categories.list.invalidate()
    },
  })

  const deleteCategory = async (categoryId: string) => {
    const result = await mutation.mutateAsync({ id: categoryId })
    return { success: true, message: 'Category deleted successfully' }
  }

  return {
    deleteCategory,
    isLoading: mutation.isPending,
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
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = trpc.finance.budget.history.useQuery({ months })

  return {
    historyData,
    isLoadingHistory,
    errorHistory,
    refetchHistory,
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
  const mutation = trpc.finance.budget.calculate.useMutation()

  return {
    calculateBudget: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

// Hook for budget vs actual analysis
export function useBudgetVsActual(monthYear?: string) {
  // TODO: Implement this with tRPC when the endpoint is available
  const queryKey = ['budget_data', 'vs_actual', monthYear, 'user']

  const query = useQuery<BudgetVsActualItem[], Error>({
    queryKey,
    queryFn: async () => {
      // Placeholder - will be replaced with tRPC call
      return []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    budgetVsActual: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
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
  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = trpc.finance.budget.transactionCategories.useQuery()

  return {
    categories,
    isLoading,
    error,
    refetch,
  }
}

export function useBulkCreateFromTransactions() {
  const utils = trpc.useUtils()

  const mutation = trpc.finance.budget.bulkCreateFromTransactions.useMutation({
    onSuccess: () => {
      utils.finance.budget.categories.list.invalidate()
      utils.finance.budget.transactionCategories.invalidate()
    },
  })

  return {
    bulkCreate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}
