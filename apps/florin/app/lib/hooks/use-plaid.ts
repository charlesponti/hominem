'use client'

import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

// Define query keys at the top of the file as constants
const PLAID_CONNECTIONS_KEY = [['plaid', 'connections']]
const PLAID_ACCOUNTS_KEY = [['plaid', 'accounts']]

// Type definitions
interface CreateLinkTokenResponse {
  success: boolean
  linkToken: string
  expiration: string
}

interface ExchangeTokenRequest {
  publicToken: string
  institutionId: string
  institutionName: string
}

interface ExchangeTokenResponse {
  success: boolean
  message: string
  institutionName: string
}

interface PlaidConnection {
  id: string
  itemId: string
  institutionId: string
  institutionName: string
  status: 'active' | 'error' | 'pending_expiration' | 'revoked'
  lastSyncedAt: string | null
  error: string | null
  createdAt: string
}

interface PlaidAccount {
  id: string
  name: string
  type: string
  balance: string
  mask: string | null
  subtype: string | null
  institutionId: string
  plaidItemId: string
  institutionName: string
  institutionLogo: string | null
}

interface SyncJobResponse {
  success: boolean
  message: string
}

/**
 * Hook for creating a Plaid link token
 */
export function useCreateLinkToken() {
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const createLinkToken = useMutation({
    mutationFn: async (): Promise<CreateLinkTokenResponse> => {
      try {
        const response = await apiClient.post<Record<string, never>, CreateLinkTokenResponse>(
          '/api/plaid/create-link-token',
          {},
          { headers: { 'Content-Type': 'application/json' } }
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create link token'))
        throw err
      }
    },
    onSuccess: () => {
      setError(null)
    },
  })

  return {
    createLinkToken,
    isLoading: createLinkToken.isLoading,
    isError: createLinkToken.isError,
    error: createLinkToken.error || error,
    data: createLinkToken.data,
  }
}

/**
 * Hook for exchanging a public token for an access token
 */
export function useExchangeToken() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const exchangeToken = useMutation({
    mutationFn: async (tokenData: ExchangeTokenRequest): Promise<ExchangeTokenResponse> => {
      try {
        const response = await apiClient.post<ExchangeTokenRequest, ExchangeTokenResponse>(
          '/api/plaid/exchange-token',
          tokenData
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to exchange token'))
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate related queries to refresh connections and accounts
      queryClient.invalidateQueries({ queryKey: PLAID_CONNECTIONS_KEY })
      queryClient.invalidateQueries({ queryKey: PLAID_ACCOUNTS_KEY })
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      setError(null)
    },
  })

  return {
    exchangeToken,
    isLoading: exchangeToken.isLoading,
    isError: exchangeToken.isError,
    error: exchangeToken.error || error,
    data: exchangeToken.data,
  }
}

/**
 * Hook for fetching Plaid connections
 * @deprecated Use useAllAccounts() instead for unified account and connection data
 */
export function usePlaidConnections(options = {}) {
  const { userId } = useAuth()
  const apiClient = useApiClient()

  const defaultOptions = {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<{ connections: PlaidConnection[] }>({
    queryKey: PLAID_CONNECTIONS_KEY,
    queryFn: async () => {
      // Use the unified endpoint to get connection data
      const response = await apiClient.get<null, { 
        accounts: Array<{
          id: string
          name: string
          type: string
          balance: string
          mask: string | null
          subtype: string | null
          institutionId?: string
          plaidItemId?: string
          institutionName?: string
          institutionLogo?: string | null
          isPlaidConnected?: boolean
        }>
        connections: PlaidConnection[] 
      }>('/api/finance/accounts/all')
      return { connections: response.connections }
    },
    ...defaultOptions,
    ...options,
  })

  return {
    connections: query.data?.connections || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching Plaid accounts
 * @deprecated Use useAllAccounts() instead for unified account data
 */
export function usePlaidAccounts(options = {}) {
  const { userId } = useAuth()
  const apiClient = useApiClient()

  const defaultOptions = {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<{ accounts: PlaidAccount[] }>({
    queryKey: PLAID_ACCOUNTS_KEY,
    queryFn: async () => {
      // Use the unified endpoint and filter for Plaid accounts only
      const response = await apiClient.get<
        null,
        {
          accounts: Array<{
            id: string
            name: string
            type: string
            balance: string
            mask: string | null
            subtype: string | null
            institutionId?: string
            plaidItemId?: string
            institutionName?: string
            institutionLogo?: string | null
            isPlaidConnected?: boolean
          }>
        }
      >('/api/finance/accounts/all')

      const plaidAccounts = response.accounts
        .filter((account) => account.isPlaidConnected)
        .map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          mask: account.mask,
          subtype: account.subtype,
          institutionId: account.institutionId || '',
          plaidItemId: account.plaidItemId || '',
          institutionName: account.institutionName || '',
          institutionLogo: account.institutionLogo || null,
        }))
      return { accounts: plaidAccounts }
    },
    ...defaultOptions,
    ...options,
  })

  return {
    accounts: query.data?.accounts || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for manually syncing a Plaid item
 */
export function useSyncPlaidItem() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const syncItem = useMutation({
    mutationFn: async (itemId: string): Promise<SyncJobResponse> => {
      try {
        const response = await apiClient.post<Record<string, unknown>, SyncJobResponse>(
          `/api/plaid/sync/${itemId}`,
          {}
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to sync item'))
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate connections to update status
      queryClient.invalidateQueries({ queryKey: PLAID_CONNECTIONS_KEY })
      queryClient.invalidateQueries({ queryKey: PLAID_ACCOUNTS_KEY })
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      setError(null)
    },
  })

  return {
    syncItem,
    isLoading: syncItem.isLoading,
    isError: syncItem.isError,
    error: syncItem.error || error,
    data: syncItem.data,
  }
}

/**
 * Hook for removing a Plaid connection
 */
export function useRemovePlaidConnection() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const removeConnection = useMutation({
    mutationFn: async (itemId: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await apiClient.delete<null, { success: boolean; message: string }>(
          `/api/plaid/connections/${itemId}`
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove connection'))
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: PLAID_CONNECTIONS_KEY })
      queryClient.invalidateQueries({ queryKey: PLAID_ACCOUNTS_KEY })
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      setError(null)
    },
  })

  return {
    removeConnection,
    isLoading: removeConnection.isLoading,
    isError: removeConnection.isError,
    error: removeConnection.error || error,
    data: removeConnection.data,
  }
}
