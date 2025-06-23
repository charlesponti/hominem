import { useApiClient } from '@hominem/ui'
import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useSupabaseAuth } from '../supabase/use-auth'

export type SortField = 'date' | 'description' | 'amount' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  direction: SortDirection
}

export interface FilterArgs {
  accountId?: string
  dateFrom?: string // ISO string format YYYY-MM-DD
  dateTo?: string // ISO string format YYYY-MM-DD
  description?: string
}

export function useFinanceAccounts() {
  const { supabase } = useSupabaseAuth()
  const api = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

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
  const { supabase } = useSupabaseAuth()
  const api = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

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

// New unified hook that combines finance and Plaid account data
export function useAllAccounts() {
  const { supabase } = useSupabaseAuth()
  const api = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

  const query = useQuery<
    {
      accounts: Array<
        FinanceAccount & {
          transactions: FinanceTransaction[]
          institutionName?: string
          institutionLogo?: string
          isPlaidConnected?: boolean
          plaidItemStatus?: string
          plaidItemError?: string | null
          plaidLastSyncedAt?: Date | null
          plaidItemInternalId?: string
        }
      >
      connections: Array<{
        id: string
        itemId: string
        institutionId: string
        institutionName: string
        status: string
        lastSyncedAt: Date | null
        error: string | null
        createdAt: Date
      }>
    },
    Error
  >({
    queryKey: ['finance', 'accounts', 'all'],
    queryFn: async () => {
      return await api.get<
        never,
        {
          accounts: Array<
            FinanceAccount & {
              transactions: FinanceTransaction[]
              institutionName?: string
              institutionLogo?: string
              isPlaidConnected?: boolean
              plaidItemStatus?: string
              plaidItemError?: string | null
              plaidLastSyncedAt?: Date | null
              plaidItemInternalId?: string
            }
          >
          connections: Array<{
            id: string
            itemId: string
            institutionId: string
            institutionName: string
            status: string
            lastSyncedAt: Date | null
            error: string | null
            createdAt: Date
          }>
        }
      >('/api/finance/accounts/all')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    accounts: query.data?.accounts || [],
    connections: query.data?.connections || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export interface UseFinanceTransactionsOptions {
  initialLimit?: number
  initialOffset?: number
  initialSortOptions?: SortOption[]
  filters?: FilterArgs
}

export function useFinanceTransactions({
  initialLimit = 25,
  initialOffset = 0,
  initialSortOptions = [{ field: 'date', direction: 'desc' }],
  filters = {},
}: UseFinanceTransactionsOptions = {}) {
  const { supabase } = useSupabaseAuth()
  const api = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

  // Filtering state is now controlled by the `filters` prop
  // Remove internal filter states: selectedAccount, dateFrom, dateTo, searchQuery
  // Remove internal filter setters: setSelectedAccount, setDateFrom, setDateTo, setSearchQuery

  const [limit, setLimit] = useState<number>(initialLimit)
  const [offset, setOffset] = useState<number>(initialOffset)
  const [sortOptions, setSortOptions] = useState<SortOption[]>(initialSortOptions)

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
    // Use filters from the prop
    if (filters.accountId && filters.accountId !== 'all')
      params.append('account', filters.accountId)
    if (filters.dateFrom) params.append('from', filters.dateFrom)
    if (filters.dateTo) params.append('to', filters.dateTo)
    if (filters.description) params.append('search', filters.description) // Assuming API uses 'search' for description

    params.append('limit', String(limit))
    params.append('offset', String(offset))
    // Append multiple sort parameters
    for (const sortOption of sortOptions) {
      params.append('sortBy', sortOption.field)
      params.append('sortDirection', sortOption.direction)
    }
    return params.toString()
  }, [filters, limit, offset, sortOptions])

  const transactionsQuery = useQuery<
    { data: FinanceTransaction[]; filteredCount: number; totalUserCount: number },
    Error
  >({
    // Include filter values in the queryKey to ensure re-fetch on change
    queryKey: ['finance', 'transactions', filters, sortOptions, limit, offset],
    queryFn: async () => {
      return await api.get<
        never,
        { data: FinanceTransaction[]; filteredCount: number; totalUserCount: number }
      >(`/api/finance/transactions?${queryString}`)
    },
    staleTime: 1 * 60 * 1000,
    keepPreviousData: true,
  })

  return {
    transactions: transactionsQuery.data?.data || [],
    totalTransactions: transactionsQuery.data?.filteredCount || 0,
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    refetch: transactionsQuery.refetch,
    limit,
    setLimit,
    offset,
    setOffset,
    page: Math.floor(offset / limit),
    setPage: (newPage: number) => setOffset(newPage * limit),
    sortOptions,
    addSortOption,
    updateSortOption,
    removeSortOption,
    // Removed individual filter setters
  }
}
