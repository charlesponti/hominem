import { redirect } from 'react-router'
import { createClient } from './client'

// Loader function for protected routes
export async function requireAuth() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw redirect('/')
  }
  return user
}

// Loader function for guest-only routes (redirect if already authenticated)
export async function requireGuest() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    throw redirect('/chat')
  }
  return null
}
