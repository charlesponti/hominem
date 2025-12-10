import { toHominemUser } from '@hominem/auth'
import { useSupabaseAuthContext } from '@hominem/ui'
import { useMemo } from 'react'

export function useSupabaseAuth() {
  const auth = useSupabaseAuthContext()

  const hominemUser = useMemo(() => (auth.user ? toHominemUser(auth.user) : null), [auth.user])

  return {
    ...auth,
    hominemUser,
  }
}
