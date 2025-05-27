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
    data: {
      id: string
      text: string
      edit_history_tweet_ids: string[]
    }
  }
  content?: {
    id: string
    type: string
    title: string
    content: string
    tweetMetadata?: Record<string, unknown>
  }
}

type TwitterPostRequest = {
  text: string
  contentId?: string
  saveAsContent?: boolean
}

type TwitterSyncResponse = {
  success: boolean
  message: string
  synced: number
  total: number
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
    mutationFn: async ({ text, contentId, saveAsContent = true }: TwitterPostRequest) => {
      const response = await post<TwitterPostRequest, TwitterPostResponse>(
        '/api/oauth/twitter/post',
        { text, contentId, saveAsContent }
      )
      return response
    },
    onSuccess: () => {
      // Invalidate content queries if we saved as content
      queryClient.invalidateQueries({ queryKey: ['content'] })
      // Optionally invalidate accounts query to refresh any status
      queryClient.invalidateQueries({ queryKey: TWITTER_QUERY_KEYS.accounts })
    },
  })
}

export function useTwitterOAuth() {
  const accountsQuery = useTwitterAccounts()
  const connectMutation = useTwitterConnect()
  const disconnectMutation = useTwitterDisconnect()
  const syncMutation = useTwitterSync()

  return {
    // Data
    accounts: accountsQuery.data || [],

    // Loading states
    isLoading: accountsQuery.isLoading,
    isConnecting: connectMutation.isLoading,
    isDisconnecting: disconnectMutation.isLoading,
    isSyncing: syncMutation.isLoading,

    // Error states
    error:
      (accountsQuery.error instanceof Error ? accountsQuery.error.message : null) ||
      (connectMutation.error instanceof Error ? connectMutation.error.message : null) ||
      (disconnectMutation.error instanceof Error ? disconnectMutation.error.message : null) ||
      (syncMutation.error instanceof Error ? syncMutation.error.message : null) ||
      null,

    // Actions
    connectTwitter: connectMutation.mutate,
    disconnectTwitter: disconnectMutation.mutate,
    syncTweets: syncMutation.mutate,

    // Refetch
    refetch: accountsQuery.refetch,
  }
}

export function useTwitterSync() {
  const { post } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await post<Record<string, never>, TwitterSyncResponse>('/api/oauth/twitter/sync', {})
    },
    onSuccess: () => {
      // Invalidate content queries to show new synced tweets
      queryClient.invalidateQueries({ queryKey: ['content'] })
    },
  })
}

export function useTwitterTokenDebug() {
  const { get } = useApiClient()

  return useQuery<{
    hasAccessToken: boolean
    hasRefreshToken: boolean
    scopes: string | null
    expiresAt: string | null
    isExpired: boolean
  }>({
    queryKey: [['twitter', 'debug']],
    queryFn: async () => {
      return get<
        null,
        {
          hasAccessToken: boolean
          hasRefreshToken: boolean
          scopes: string | null
          expiresAt: string | null
          isExpired: boolean
        }
      >('/api/oauth/twitter/debug')
    },
  })
}
