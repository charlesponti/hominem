import type {
  BudgetCategoriesListOutput,
  BudgetCategoryCreateInput,
  BudgetCategoryCreateOutput,
  BudgetCategoryUpdateInput,
  BudgetCategoryUpdateOutput,
  BudgetCategoryGetOutput,
  BudgetCategoryDeleteOutput,
  BudgetTrackingOutput,
  BudgetHistoryOutput,
  BudgetCalculateInput,
  BudgetCalculateOutput,
  BudgetBulkCreateInput,
  BudgetBulkCreateOutput,
  TransactionCategoryAnalysisOutput,
  BudgetCategoriesListWithSpendingOutput,
} from '@hominem/hono-rpc/types/finance.types'

import { useHonoMutation, useHonoQuery, useHonoUtils } from '~/lib/api'

const BUDGET_API_UNAVAILABLE_MESSAGE = 'Budget write endpoints are unavailable'

function rejectBudgetMutation<T>(): Promise<T> {
  return Promise.reject(new Error(BUDGET_API_UNAVAILABLE_MESSAGE))
}

function emptyBudgetTracking(monthYear: string): BudgetTrackingOutput {
  const tracking: BudgetTrackingOutput = {
    month: monthYear || new Date().toISOString().slice(0, 7),
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    status: 'on-track',
    categories: [],
  }
  if (monthYear) {
    tracking.monthYear = monthYear
  }
  return tracking
}

export const useTransactionCategories = () =>
  useHonoQuery<TransactionCategoryAnalysisOutput>(
    ['finance', 'budget', 'transaction-categories'],
    async () => [],
  )

export const useBudgetCategories = () =>
  useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list'],
    async (client) => {
      const res = await client.api.finance.tags.list.$post({ json: {} })
      const categories = await res.json()
      return categories.map((category) => {
        const normalized = {
          id: category.id,
          userId: category.userId,
          name: category.name,
        }
        return typeof category.color === 'string'
          ? { ...normalized, color: category.color }
          : normalized
      })
    },
  )

const useBudgetCategoriesWithSpending = (monthYear: string) =>
  useHonoQuery<BudgetCategoriesListWithSpendingOutput>(
    ['finance', 'budget', 'categories', 'list-with-spending', monthYear],
    async () => [],
    { enabled: !!monthYear },
  )

const useBudgetCategory = (id: string) =>
  useHonoQuery<BudgetCategoryGetOutput>(
    ['finance', 'budget', 'categories', 'get', id],
    async () => rejectBudgetMutation<BudgetCategoryGetOutput>(),
    { enabled: !!id },
  )

const useBudgetTracking = (monthYear: string) =>
  useHonoQuery<BudgetTrackingOutput>(
    ['finance', 'budget', 'tracking', monthYear],
    async () => emptyBudgetTracking(monthYear),
    { enabled: !!monthYear },
  )

export const useBudgetHistory = (params: { months: number }) =>
  useHonoQuery<BudgetHistoryOutput>(
    ['finance', 'budget', 'history', params.months],
    async () => [],
  )

const useCreateBudgetCategory = () => {
  const utils = useHonoUtils()

  return useHonoMutation<BudgetCategoryCreateOutput, BudgetCategoryCreateInput>(
    async () => rejectBudgetMutation<BudgetCategoryCreateOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories'])
        utils.invalidate(['finance', 'budget', 'tracking'])
        utils.invalidate(['finance', 'budget', 'history'])
      },
    },
  )
}

const useUpdateBudgetCategory = () => {
  const utils = useHonoUtils()

  return useHonoMutation<BudgetCategoryUpdateOutput, BudgetCategoryUpdateInput>(
    async () => rejectBudgetMutation<BudgetCategoryUpdateOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories'])
        utils.invalidate(['finance', 'budget', 'tracking'])
        utils.invalidate(['finance', 'budget', 'history'])
      },
    },
  )
}

const useDeleteBudgetCategory = () => {
  const utils = useHonoUtils()

  return useHonoMutation<BudgetCategoryDeleteOutput, { id: string }>(
    async () => rejectBudgetMutation<BudgetCategoryDeleteOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories'])
        utils.invalidate(['finance', 'budget', 'tracking'])
        utils.invalidate(['finance', 'budget', 'history'])
      },
    },
  )
}

const useBulkCreateBudgetCategories = () => {
  const utils = useHonoUtils()

  return useHonoMutation<BudgetBulkCreateOutput, BudgetBulkCreateInput>(
    async () => rejectBudgetMutation<BudgetBulkCreateOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories'])
        utils.invalidate(['finance', 'budget', 'tracking'])
        utils.invalidate(['finance', 'budget', 'history'])
      },
    },
  )
}

export const useCalculateBudget = (options?: { onError?: (error: Error) => void }) => {
  const utils = useHonoUtils()

  return useHonoMutation<BudgetCalculateOutput, BudgetCalculateInput | undefined>(
    async () => rejectBudgetMutation<BudgetCalculateOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'calculate'])
      },
      ...(options?.onError && { onError: options.onError }),
    },
  )
}
