import { useApiClient } from '@hominem/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type TwitterAccount = {
  id: string
  provider: string
  providerAccountId: string
  expiresAt: string | null
}

type TwitterAccountsResponse = {
  success: boolean
  accounts: TwitterAccount[]
}

type TwitterAuthResponse = {
  success: boolean
  authUrl: string
}

type TwitterDisconnectResponse = {
  success: boolean
  message: string
}

type TwitterPostResponse = {
  success: boolean
  tweet: {
    id: string
    text: string
  }
}

type TwitterPostRequest = {
  text: string
}

// Query keys for React Query
const TWITTER_QUERY_KEYS = {
  accounts: ['twitter', 'accounts'] as const,
} as const

export function useTwitterAccounts() {
  const { get } = useApiClient()

  return useQuery({
    queryKey: TWITTER_QUERY_KEYS.accounts,
    queryFn: async () => {
      const response = await get<null, TwitterAccountsResponse>('/api/oauth/twitter/accounts')
      return response.accounts
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useTwitterConnect() {
  const { get } = useApiClient()

  return useMutation({
    mutationFn: async () => {
      const response = await get<null, TwitterAuthResponse>('/api/oauth/twitter/authorize')
      return response.authUrl
    },
    onSuccess: (authUrl) => {
      // Redirect to Twitter authorization
      window.location.href = authUrl
    },
  })
}

export function useTwitterDisconnect() {
  const { post } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      return await post<{ accountId: string }, TwitterDisconnectResponse>(
        '/api/oauth/twitter/disconnect',
        { accountId }
      )
    },
    onSuccess: () => {
      // Invalidate and refetch accounts
      queryClient.invalidateQueries({ queryKey: TWITTER_QUERY_KEYS.accounts })
    },
  })
}

export function useTwitterPost() {
  const { post } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ text }: TwitterPostRequest) => {
      const response = await post<TwitterPostRequest, TwitterPostResponse>(
        '/api/oauth/twitter/post',
        { text }
      )
      return response
    },
    onSuccess: () => {
      // Optionally invalidate accounts query to refresh any status
      queryClient.invalidateQueries({ queryKey: TWITTER_QUERY_KEYS.accounts })
    },
  })
}

export function useTwitterOAuth() {
  const accountsQuery = useTwitterAccounts()
  const connectMutation = useTwitterConnect()
  const disconnectMutation = useTwitterDisconnect()

  return {
    // Data
    accounts: accountsQuery.data || [],

    // Loading states
    isLoading: accountsQuery.isLoading,
    isConnecting: connectMutation.isLoading,
    isDisconnecting: disconnectMutation.isLoading,

    // Error states
    error:
      (accountsQuery.error instanceof Error ? accountsQuery.error.message : null) ||
      (connectMutation.error instanceof Error ? connectMutation.error.message : null) ||
      (disconnectMutation.error instanceof Error ? disconnectMutation.error.message : null) ||
      null,

    // Actions
    connectTwitter: connectMutation.mutate,
    disconnectTwitter: disconnectMutation.mutate,

    // Refetch
    refetch: accountsQuery.refetch,
  }
}
