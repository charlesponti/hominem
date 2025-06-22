import { createClient } from './client'

export function useSupabaseAuth() {
  const supabase = createClient()

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    getUser,
    signInWithGoogle,
    signOut,
    supabase,
  }
}
