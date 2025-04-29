'use client'

import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react' // Added useMemo
import { useApiClient } from '~/lib/hooks/use-api-client'

// --- Hook for fetching Finance Accounts ---
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
    // Consider adding sort params if backend supports it
    // params.append('sort', sortField);
    // params.append('direction', sortDirection);
    return params.toString()
  }, [selectedAccount, dateFrom, dateTo, searchQuery, limit, offset /*, sortField, sortDirection*/])

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
    staleTime: 1 * 60 * 1000, // 1 minute, transactions might change more often
    keepPreviousData: true, // Useful for pagination to avoid flickering
  })

  // Perform client-side sorting (if backend doesn't support it)
  // Note: Client-side filtering is removed as it duplicates backend logic
  const sortedTransactions = useMemo(() => {
    const dataToSort = transactionsQuery.data || []
    // If backend handles sorting, return data directly: return dataToSort;

    return [...dataToSort].sort((a, b) => {
      let comparison = 0
      const valA = a[sortField as keyof FinanceTransaction]
      const valB = b[sortField as keyof FinanceTransaction]

      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortField === 'amount') {
        comparison = Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB)
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB
      }
      // Add more type checks if needed

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [transactionsQuery.data, sortField, sortDirection])

  // Pagination helpers
  const page = Math.floor(offset / limit)
  const setPage = (newPage: number) => {
    setOffset(newPage * limit)
  }

  return {
    // Data
    transactions: sortedTransactions, // Use sorted (and potentially filtered) data
    rawTransactions: transactionsQuery.data, // Raw data from query if needed
    isLoading: transactionsQuery.isLoading,
    isFetching: transactionsQuery.isFetching, // More granular loading state
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
    // Consider adding total count from backend if available for better pagination UI
  }
}

// --- Other Helper Functions (can be moved or kept separate) ---

// Example: Delete All Data Mutation (can be in its own hook like `useFinanceSettings`)
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// export function useDeleteAllFinanceData() {
//   const api = useApiClient();
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async () => api.delete('/api/finance'),
//     onSuccess: () => {
//       // Invalidate all finance queries
//       queryClient.invalidateQueries({ queryKey: ['finance'] });
//     },
//   });
// }

// Example: Export Function (can be a standalone utility)
// export function exportTransactionsCSV(transactions: FinanceTransaction[], accountsMap: Map<string, FinanceAccount>) {
//    // ... (CSV generation logic from original hook) ...
// }
