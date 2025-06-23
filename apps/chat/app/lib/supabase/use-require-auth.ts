import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSupabaseAuth } from './use-auth'

interface UseRequireAuthOptions {
  redirectTo?: string
  requireAuth?: boolean
}

export function useRequireAuth({
  redirectTo = '/',
  requireAuth = true,
}: UseRequireAuthOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const { getUser } = useSupabaseAuth()

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const currentUser = await getUser()

        if (mounted) {
          setUser(currentUser)
          setIsLoading(false)

          // Redirect logic
          if (requireAuth && !currentUser) {
            navigate(redirectTo)
          } else if (!requireAuth && currentUser) {
            navigate('/chat')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (mounted) {
          setIsLoading(false)
          if (requireAuth) {
            navigate(redirectTo)
          }
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [navigate, redirectTo, requireAuth, getUser])

  return { user, isLoading, isAuthenticated: !!user }
}
