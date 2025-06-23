import { useCallback, useMemo } from 'react'
import { createClient } from './client'

export function useSupabaseAuth() {
  const supabase = useMemo(() => createClient(), [])

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }, [supabase.auth])

  return {
    getUser,
    supabase,
  }
}
