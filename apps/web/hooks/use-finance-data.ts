'use client'

import { useApiClient } from '@/lib/hooks/use-api-client'
import type { FinanceAccount, Transaction } from '@ponti/utils/schema'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export interface FinanceData {
  transactions: Transaction[]
  accounts: FinanceAccount[]
  accountsMap: Map<string, FinanceAccount>
  loading: boolean
  error: string | null

  // Filter options
  selectedAccount: string
  setSelectedAccount: (account: string) => void
  dateFrom: Date | undefined
  setDateFrom: (date: Date | undefined) => void
  dateTo: Date | undefined
  setDateTo: (date: Date | undefined) => void
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Sorting
  sortField: string
  setSortField: (field: string) => void
  sortDirection: 'asc' | 'desc'
  setSortDirection: (direction: 'asc' | 'desc') => void

  // Filtered and sorted transactions
  filteredTransactions: Transaction[]

  // Helpers
  getTotalBalance: () => number
  getRecentTransactions: (accountName: string, limit?: number) => Transaction[]
  getFilterQueryString: () => string
  exportTransactions: () => void
  refreshData: () => Promise<void>
}

export function useFinanceData(): FinanceData {
  const api = useApiClient()

  // Filtering state
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Sorting state
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Generate query string from filters
  const getFilterQueryString = () => {
    const params = new URLSearchParams()

    if (selectedAccount !== 'all') {
      params.append('account', selectedAccount)
    }

    if (dateFrom) {
      params.append('from', dateFrom.toISOString().split('T')[0])
    }

    if (dateTo) {
      params.append('to', dateTo.toISOString().split('T')[0])
    }

    if (searchQuery) {
      params.append('search', searchQuery)
    }

    // Add a limit to prevent loading too many transactions
    params.append('limit', '500')

    const queryString = params.toString()
    return queryString ? `?${queryString}` : ''
  }

  // Query for accounts
  const accountsQuery = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: async () => {
      return await api.get<unknown, FinanceAccount[]>('/api/finance/accounts')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Query for transactions with dependencies on filters
  const transactionsQuery = useQuery({
    queryKey: ['finance', 'transactions', { selectedAccount, dateFrom, dateTo, searchQuery }],
    queryFn: async () => {
      const queryString = getFilterQueryString()
      return await api.get<unknown, Transaction[]>(`/api/finance/transactions${queryString}`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Combine loading and error states
  const loading = accountsQuery.isLoading || transactionsQuery.isLoading
  const error =
    (accountsQuery.error && accountsQuery.error instanceof Error
      ? accountsQuery.error.message
      : null) ||
    (transactionsQuery.error && transactionsQuery.error instanceof Error
      ? transactionsQuery.error.message
      : null) ||
    null

  // Extract data with fallbacks
  const accounts = accountsQuery.data || []
  const transactions = transactionsQuery.data || []
  const accountsMap = new Map(accounts.map((account) => [account.id, account]))
  // Calculate filtered and sorted transactions
  const filteredTransactions = transactions
    .filter((transaction) => {
      // Client-side additional filtering
      if (
        selectedAccount !== 'all' &&
        accountsMap.get(transaction.accountId)?.type !== selectedAccount
      ) {
        return false
      }

      // Filter by date range
      if (dateFrom && new Date(transaction.date) < dateFrom) {
        return false
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59)
        if (new Date(transaction.date) > endDate) {
          return false
        }
      }

      // Filter by search term
      if (
        searchQuery &&
        ![transaction.description, transaction.note]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      // Sort by the selected field
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'description':
          comparison = (b.description && a.description?.localeCompare(b.description)) || 0
          break
        case 'amount':
          comparison = Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
          break
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '')
          break
        default:
          comparison = 0
      }

      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison
    })

  // Helper functions
  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + Number.parseFloat(account.balance || '0'), 0)
  }

  const getRecentTransactions = (accountName: string, limit = 3) => {
    return transactions
      .filter((tx) => {
        const account = accountsMap.get(tx.accountId)
        return account?.name === accountName
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  // Export transactions as CSV
  const exportTransactions = () => {
    // Create CSV content
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account']

    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((tx) => {
        const account = accountsMap.get(tx.accountId)
        if (!account) {
          return ''
        }

        return [
          tx.date,
          `"${tx.description?.replace(/"/g, '""')}"`, // Handle quotes in description
          tx.amount,
          tx.category || 'Other',
          tx.type,
          account.name || 'Unknown',
        ].join(',')
      }),
    ]

    const csvContent = csvRows.join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `transactions-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Public refresh method using React Query's refetch
  const refreshData = async () => {
    await Promise.all([accountsQuery.refetch(), transactionsQuery.refetch()])
  }

  return {
    transactions,
    accounts,
    accountsMap,
    loading,
    error,
    selectedAccount,
    setSelectedAccount,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredTransactions,
    getTotalBalance,
    getRecentTransactions,
    getFilterQueryString,
    exportTransactions,
    refreshData,
  }
}
