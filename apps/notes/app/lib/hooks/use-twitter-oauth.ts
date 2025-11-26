import { trpc } from '~/lib/trpc'
import { useToast } from '~/components/ui/use-toast'
import { useCallback } from 'react'

export function useTwitterOAuth() {
  // keeping this stub as it was in original, potentially unused or pending implementation
  const refetch = useCallback(async () => {}, [])

  return {
    refetch,
  }
}

export function useTwitterAccounts() {
  const { data: accounts, isLoading, refetch } = trpc.twitter.accounts.useQuery()

  return {
    data: accounts || [],
    isLoading,
    refetch,
  }
}

export function useTwitterPost() {
  const { toast } = useToast()

  const mutation = trpc.twitter.post.useMutation({
    onSuccess: () => {
      toast({ title: 'Tweet posted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error posting tweet', description: error.message, variant: 'destructive' })
    },
  })

  return mutation
}
