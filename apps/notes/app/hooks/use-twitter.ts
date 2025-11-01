import { trpc } from '~/lib/trpc'

type TwitterAccount = {
  id: string
  provider: string
  providerAccountId: string
  expiresAt: string | null
}

type TwitterPostRequest = {
  text: string
  contentId?: string
  saveAsContent?: boolean
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

/**
 * Hook to get connected Twitter accounts
 */
export function useTwitterAccounts() {
  const query = trpc.twitter.accounts.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return {
    accounts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook to connect Twitter account
 */
export function useTwitterConnect() {
  const _utils = trpc.useUtils()

  const connectMutation = trpc.twitter.authorize.useMutation({
    onSuccess: (data) => {
      // Redirect to Twitter authorization
      window.location.href = data.authUrl
    },
  })

  return {
    connect: connectMutation.mutate,
    isLoading: connectMutation.isPending,
    error: connectMutation.error,
  }
}

/**
 * Hook to disconnect Twitter account
 */
export function useTwitterDisconnect() {
  const utils = trpc.useUtils()

  const disconnectMutation = trpc.twitter.disconnect.useMutation({
    onSuccess: () => {
      utils.twitter.accounts.invalidate()
    },
  })

  return {
    disconnect: disconnectMutation.mutate,
    isLoading: disconnectMutation.isPending,
    error: disconnectMutation.error,
  }
}

/**
 * Hook to post tweet
 */
export function useTwitterPost() {
  const utils = trpc.useUtils()

  const postMutation = trpc.twitter.post.useMutation({
    onSuccess: () => {
      // Invalidate content queries if we saved as content
      utils.contentStrategies.list.invalidate()
      // Optionally invalidate accounts query to refresh any status
      utils.twitter.accounts.invalidate()
    },
  })

  return {
    postTweet: postMutation.mutate,
    isLoading: postMutation.isPending,
    error: postMutation.error,
    data: postMutation.data,
  }
}

/**
 * Hook to sync tweets
 */
export function useTwitterSync() {
  const utils = trpc.useUtils()

  const syncMutation = trpc.twitter.sync.useMutation({
    onSuccess: () => {
      // Invalidate content queries to show new synced tweets
      utils.contentStrategies.list.invalidate()
    },
  })

  return {
    sync: syncMutation.mutate,
    isLoading: syncMutation.isPending,
    error: syncMutation.error,
    data: syncMutation.data,
  }
}

/**
 * Combined hook for Twitter OAuth functionality
 */
export function useTwitterOAuth() {
  const accountsQuery = useTwitterAccounts()
  const connectMutation = useTwitterConnect()
  const disconnectMutation = useTwitterDisconnect()
  const syncMutation = useTwitterSync()

  return {
    // Data
    accounts: accountsQuery.accounts,

    // Loading states
    isConnecting: connectMutation.isLoading,
    isDisconnecting: disconnectMutation.isLoading,
    isSyncing: syncMutation.isLoading,

    // Error states
    error: connectMutation.error || disconnectMutation.error || syncMutation.error,

    // Actions
    connect: connectMutation.connect,
    disconnect: disconnectMutation.disconnect,
    sync: syncMutation.sync,

    // Refetch
    refetch: accountsQuery.refetch,
  }
}
