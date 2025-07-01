import type { ActionFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase/server'

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await request.json()
  const { supabase } = createSupabaseServerClient(request)

  if (!token || typeof token !== 'string') {
    throw new Response(JSON.stringify({ isValid: false }), { status: 400 })
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Token validation failed:', error?.message || 'No user found')
      throw new Response(JSON.stringify({ isValid: false }), { status: 401 })
    }

    return new Response(JSON.stringify({ isValid: true }), { status: 200 })
  } catch (error) {
    console.error('Error validating token:', error)
    throw new Response(JSON.stringify({ isValid: false }), { status: 500 })
  }
}
