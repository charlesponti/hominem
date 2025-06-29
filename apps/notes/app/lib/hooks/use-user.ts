import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export function useUser() {
  const { getUser, supabase } = useSupabaseAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setError(null)
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (err) {
        console.error('Error fetching user:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [getUser])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      console.error('Sign out error:', err)
      throw err
    }
  }

  const signIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      console.error('Sign in failed:', err)
      throw err
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !isLoading && !!user,
    signOut,
    signIn,
  }
} 
