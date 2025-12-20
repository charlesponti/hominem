import { useSupabaseAuthContext } from '@hominem/auth'
import { useEffect } from 'react'
import { useRevalidator } from 'react-router'

/**
 * Component that listens for Supabase auth state changes and triggers
 * a React Router revalidation. This ensures that server-side loaders
 * re-run with the updated session/cookie state.
 */
export function AuthRevalidator() {
  const { supabase } = useSupabaseAuthContext()
  const revalidator = useRevalidator()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _session) => {
      // Revalidate on major auth events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        revalidator.revalidate()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, revalidator])

  return null
}
