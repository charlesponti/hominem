import { useCallback, useState } from 'react'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export function useTwitterOAuth() {
  const { userId } = useSupabaseAuth()

  const refetch = useCallback(async () => {}, [])

  return {
    refetch,
  }
}

export function useTwitterAccounts() {
  const [accounts, _setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    accounts,
    isLoading,
    fetchAccounts,
  }
}

export function useTwitterPost() {
  const [isPosting, setIsPosting] = useState(false)

  const postTweet = useCallback(async (_content: string) => {
    setIsPosting(true)
    try {
      return { success: true }
    } finally {
      setIsPosting(false)
    }
  }, [])

  return {
    postTweet,
    isPosting,
  }
}
