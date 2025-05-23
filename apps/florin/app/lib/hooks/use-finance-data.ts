import { useApiClient } from '@hominem/ui'
import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

export type SortField = 'date' | 'description' | 'amount' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  direction: SortDirection
}

export function useFinanceAccounts() {
  const api = useApiClient()

  const accountsQuery = useQuery<FinanceAccount[], Error>({
    queryKey: ['finance', 'accounts'],
    queryFn: async () => {
      return await api.get<never, FinanceAccount[]>('/api/finance/accounts')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const accountsMap = useMemo(() => {
    return new Map((accountsQuery.data || []).map((account) => [account.id, account]))
  }, [accountsQuery.data])

  return {
    accounts: accountsQuery.data || [],
    accountsMap,
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    refetch: accountsQuery.refetch,
  }
}

export function useFinanceAccountSummary() {
  const api = useApiClient()

  const query = useQuery<Array<FinanceAccount & { transactions: FinanceTransaction[] }>, Error>({
    queryKey: ['finance', 'accounts', 'summary'],
    queryFn: async () => {
      return await api.get<never, Array<FinanceAccount & { transactions: FinanceTransaction[] }>>(
        '/api/finance/accounts/summary'
      )
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    accountSummary: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Hook for fetching and managing Finance Transactions ---
export interface UseFinanceTransactionsOptions {
  initialLimit?: number
  initialOffset?: number
  initialSortOptions?: SortOption[] // Add initialSortOptions
}

export function useFinanceTransactions({
  initialLimit = 25,
  initialOffset = 0,
  initialSortOptions = [{ field: 'date', direction: 'desc' }], // Default sort option
}: UseFinanceTransactionsOptions = {}) {
  const api = useApiClient()

  // Filtering state
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [limit, setLimit] = useState<number>(initialLimit)
  const [offset, setOffset] = useState<number>(initialOffset)

  // Sorting state - now an array of SortOption
  const [sortOptions, setSortOptions] = useState<SortOption[]>(initialSortOptions)

  // Functions to manage sortOptions
  const addSortOption = useCallback((option: SortOption) => {
    setSortOptions((prevOptions) => [...prevOptions, option])
  }, [])

  const removeSortOption = useCallback((index: number) => {
    setSortOptions((prevOptions) => prevOptions.filter((_, i) => i !== index))
  }, [])

  const updateSortOption = useCallback((index: number, option: SortOption) => {
    setSortOptions((prevOptions) => prevOptions.map((item, i) => (i === index ? option : item)))
  }, [])

  // Generate query string from filters and sortOptions
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedAccount !== 'all') params.append('account', selectedAccount)
    if (dateFrom) params.append('from', dateFrom.toISOString().split('T')[0])
    if (dateTo) params.append('to', dateTo.toISOString().split('T')[0])
    if (searchQuery) params.append('search', searchQuery)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    // Append multiple sort parameters
    for (const sortOption of sortOptions) {
      params.append('sortBy', sortOption.field)
      params.append('sortDirection', sortOption.direction)
    }
    return params.toString()
  }, [selectedAccount, dateFrom, dateTo, searchQuery, limit, offset, sortOptions])

  const transactionsQuery = useQuery<
    { data: FinanceTransaction[]; filteredCount: number; totalUserCount: number },
    Error
  >({
    queryKey: [
      'finance',
      'transactions',
      {
        selectedAccount,
        dateFrom,
        dateTo,
        searchQuery,
        limit,
        offset,
        sortOptions, // Use sortOptions in queryKey
      },
    ],
    queryFn: async () => {
      return await api.get<
        never,
        { data: FinanceTransaction[]; filteredCount: number; totalUserCount: number }
      >(`/api/finance/transactions?${queryString}`)
    },
    staleTime: 1 * 60 * 1000,
    keepPreviousData: true,
  })

  const sortedTransactions = useMemo(() => {
    return transactionsQuery.data?.data || []
  }, [transactionsQuery.data])

  const filteredTransactionCount = useMemo(() => {
    return transactionsQuery.data?.filteredCount || 0
  }, [transactionsQuery.data])

  const totalUserTransactionCount = useMemo(() => {
    return transactionsQuery.data?.totalUserCount || 0
  }, [transactionsQuery.data])

  // Pagination helpers
  const page = Math.floor(offset / limit)
  const setPage = (newPage: number) => {
    setOffset(newPage * limit)
  }

  return {
    // Data
    transactions: sortedTransactions,
    filteredTransactionCount,
    totalUserTransactionCount,
    rawTransactions: transactionsQuery.data?.data,
    isLoading: transactionsQuery.isLoading,
    isFetching: transactionsQuery.isFetching,
    error: transactionsQuery.error,
    refetch: transactionsQuery.refetch,

    // Filter state and setters
    selectedAccount,
    setSelectedAccount,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,

    // Sorting state and setters
    sortOptions, // Expose sortOptions
    addSortOption, // Expose addSortOption
    removeSortOption, // Expose removeSortOption
    updateSortOption, // Expose updateSortOption

    // Pagination state and setters
    limit,
    setLimit,
    offset,
    setOffset,
    page,
    setPage,
  }
}

// --- Hook for fetching monthly financial statistics ---
export interface MonthlyStatsData {
  month: string
  startDate: string
  endDate: string
  totalIncome: number
  totalExpenses: number
  netIncome: number
  transactionCount: number
  categorySpending: Array<{ name: string | null; amount: number }>
}

export function useMonthlyStats(monthYear: string | null) {
  // monthYear in YYYY-MM format
  const api = useApiClient()

  const query = useQuery<MonthlyStatsData, Error>({
    queryKey: ['finance', 'stats', 'monthly', monthYear],
    queryFn: async () => {
      if (!monthYear) {
        // Or throw an error, or return default empty state
        // This depends on how you want to handle an unselected/invalid monthYear
        return Promise.reject(new Error('Month and year must be provided.'))
      }
      return await api.get<never, MonthlyStatsData>(`/api/finance/monthly-stats/${monthYear}`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!monthYear, // Only run the query if monthYear is provided
  })

  return {
    monthlyStats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
