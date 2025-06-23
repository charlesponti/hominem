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

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase.auth])

  return {
    getUser,
    signOut,
    supabase,
  }
}
