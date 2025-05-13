import { useApiClient } from '@hominem/ui'
import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

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
  initialSortField?: string
  initialSortDirection?: 'asc' | 'desc'
}

export function useFinanceTransactions({
  initialLimit = 25,
  initialOffset = 0,
  initialSortField = 'date',
  initialSortDirection = 'desc',
}: UseFinanceTransactionsOptions = {}) {
  const api = useApiClient()
  const { accountsMap } = useFinanceAccounts() // Get accountsMap for client-side filtering/sorting if needed

  // Filtering state
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [limit, setLimit] = useState<number>(initialLimit)
  const [offset, setOffset] = useState<number>(initialOffset)

  // Sorting state
  const [sortField, setSortField] = useState<string>(initialSortField)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection)

  // Generate query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedAccount !== 'all') params.append('account', selectedAccount)
    if (dateFrom) params.append('from', dateFrom.toISOString().split('T')[0])
    if (dateTo) params.append('to', dateTo.toISOString().split('T')[0])
    if (searchQuery) params.append('search', searchQuery)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    params.append('sortBy', sortField)
    params.append('sortDirection', sortDirection)
    return params.toString()
  }, [selectedAccount, dateFrom, dateTo, searchQuery, limit, offset, sortField, sortDirection])

  // Query for transactions with dependencies on filters
  const transactionsQuery = useQuery<FinanceTransaction[], Error>({
    // Include all state dependencies in the query key
    queryKey: [
      'finance',
      'transactions',
      { selectedAccount, dateFrom, dateTo, searchQuery, limit, offset, sortField, sortDirection },
    ],
    queryFn: async () => {
      return await api.get<never, FinanceTransaction[]>(`/api/finance/transactions?${queryString}`)
    },
    staleTime: 1 * 60 * 1000,
    keepPreviousData: true,
  })

  // No need for client-side sorting now, as the data is already sorted by the server
  const sortedTransactions = useMemo(() => {
    return transactionsQuery.data || []
  }, [transactionsQuery.data])

  // Pagination helpers
  const page = Math.floor(offset / limit)
  const setPage = (newPage: number) => {
    setOffset(newPage * limit)
  }

  return {
    // Data
    transactions: sortedTransactions,
    rawTransactions: transactionsQuery.data,
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
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,

    // Pagination state and setters
    limit,
    setLimit,
    offset,
    setOffset,
    page,
    setPage,
  }
}
