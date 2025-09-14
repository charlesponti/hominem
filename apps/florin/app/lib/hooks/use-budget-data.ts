'use client'

import { supabase, useApiClient, useSupabaseAuth } from '@hominem/ui'
import type { BudgetCategory } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

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

// Centralize auth token handling
const useAuthHeaders = () => {
  const { userId } = useSupabaseAuth()

  const getAuthHeaders = async () => {
    if (!userId) throw new Error('User not authenticated to get headers.')
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || userId}`,
    }
  }
  return { getAuthHeaders, userId }
}

export function useBudgetCategories() {
  const api = useApiClient()
  const { getAuthHeaders, userId } = useAuthHeaders()
  const queryKey = [BUDGET_DATA_KEY_PREFIX, 'categories', userId]

  const query = useQuery<BudgetCategory[], Error>({
    queryKey,
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return await api.get<never, BudgetCategory[]>('/api/finance/budget/categories', { headers })
    },
    enabled: !!userId,
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
  const { getAuthHeaders, userId } = useAuthHeaders()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation<BudgetCategory, Error, BudgetCategoryCreation>({
    mutationFn: async (newCategoryData) => {
      const headers = await getAuthHeaders()
      const payload = {
        name: newCategoryData.name,
        type: newCategoryData.type,
        allocatedAmount: Number(newCategoryData.allocatedAmount),
        budgetId: newCategoryData.budgetId,
        averageMonthlyExpense: String(newCategoryData.allocatedAmount),
      }
      return await api.post<BudgetCategoryCreation, BudgetCategory>(
        '/api/finance/budget/categories',
        payload,
        { headers }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_DATA_KEY_PREFIX, 'categories', userId] })
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
  const { getAuthHeaders, userId } = useAuthHeaders()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation<BudgetCategory, Error, BudgetCategoryUpdate>({
    mutationFn: async (categoryUpdateData) => {
      const headers = await getAuthHeaders()
      const { id, ...updateData } = categoryUpdateData
      const payload: Record<string, unknown> = { ...updateData }
      if (updateData.allocatedAmount !== undefined) {
        payload.allocatedAmount = Number(updateData.allocatedAmount)
      }
      return await api.put<typeof payload, BudgetCategory>(
        `/api/finance/budget/categories/${id}`,
        payload,
        { headers }
      )
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_DATA_KEY_PREFIX, 'categories', userId] })
      queryClient.invalidateQueries({
        queryKey: [BUDGET_DATA_KEY_PREFIX, 'categories', variables.id, userId],
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
  const { getAuthHeaders, userId } = useAuthHeaders()

  const mutation = useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (categoryId) => {
      const headers = await getAuthHeaders()
      return await api.delete<never, { success: boolean; message: string }>(
        `/api/finance/budget/categories/${categoryId}`,
        { headers }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_DATA_KEY_PREFIX, 'categories', userId] })
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
  const { getAuthHeaders, userId } = useAuthHeaders()
  const queryKey = [BUDGET_DATA_KEY_PREFIX, 'history', months, userId]

  const query = useQuery<BudgetHistoryDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return await api.get<never, BudgetHistoryDataPoint[]>(
        `/api/finance/budget/history?months=${months}`,
        { headers }
      )
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
  })

  return {
    historyData: query.data,
    isLoadingHistory: query.isLoading,
    errorHistory: query.error,
    refetchHistory: query.refetch,
  }
}
