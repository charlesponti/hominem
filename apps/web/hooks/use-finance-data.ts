'use client'

import { useState, useEffect } from 'react'

export interface Transaction {
  id: string
  date: string
  description: string
  amount: string
  category: string
  type: 'debit' | 'credit' | string
  accountName?: string
  accountMask?: string
  status?: string
}

export interface Account {
  id: string
  name: string
  balance: string
  type: string
  institution?: string
}

interface FinanceData {
  transactions: Transaction[]
  accounts: Account[]
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtering state
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Sorting state
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch data function
  const fetchData = async () => {
    setLoading(true)
    try {
      // Build query string for filters
      const queryString = getFilterQueryString()

      // Fetch accounts
      const accountsResponse = await fetch('/api/finance/accounts')
      if (!accountsResponse.ok) {
        throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`)
      }
      const accountsData = await accountsResponse.json()
      setAccounts(accountsData)

      // Fetch transactions with filters
      const transactionsResponse = await fetch(`/api/finance/transactions${queryString}`)
      if (!transactionsResponse.ok) {
        throw new Error(`Failed to fetch transactions: ${transactionsResponse.status}`)
      }
      const transactionsData = await transactionsResponse.json()
      setTransactions(transactionsData)

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching finance data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [])

  // Refresh data with current filters when they change
  useEffect(() => {
    fetchData()
    // Exclude sortField and sortDirection since we do client-side sorting
  }, [selectedAccount, dateFrom, dateTo, searchQuery])

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

  // Calculate filtered and sorted transactions
  const filteredTransactions = transactions
    .filter((transaction) => {
      // Client-side additional filtering (in case server didn't apply all filters)
      // Most filtering should happen on the server, but we do a second pass here

      // Filter by account
      if (selectedAccount !== 'all' && transaction.accountName !== selectedAccount) {
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
        !transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
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
          comparison = a.description.localeCompare(b.description)
          break
        case 'amount':
          comparison = parseFloat(a.amount) - parseFloat(b.amount)
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
    return accounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0)
  }

  const getRecentTransactions = (accountName: string, limit = 3) => {
    return transactions
      .filter((tx) => tx.accountName === accountName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  // Export transactions as CSV
  const exportTransactions = () => {
    // Create CSV content
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account']

    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((tx) =>
        [
          tx.date,
          `"${tx.description.replace(/"/g, '""')}"`, // Handle quotes in description
          tx.amount,
          tx.category || 'Uncategorized',
          tx.type,
          tx.accountName || 'Unknown',
        ].join(',')
      ),
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

  // Public refresh method
  const refreshData = async () => {
    await fetchData()
  }

  return {
    transactions,
    accounts,
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
