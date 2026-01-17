import { createSupabaseServerClient, getServerAuthConfig } from '@hominem/auth/server'
import type { ActionFunctionArgs } from 'react-router'

export async function action({ request }: ActionFunctionArgs) {
  const { refreshToken } = await request.json()
  const config = getServerAuthConfig()
  const { supabase } = createSupabaseServerClient(request, config)

  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Response(JSON.stringify({ error: 'Missing refresh token' }), { status: 400 })
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error) {
      console.error('Error refreshing token:', error)
      throw new Response(JSON.stringify({ error: error.message }), { status: 401 })
    }

    if (!data.session) {
      throw new Response(JSON.stringify({ error: 'Failed to get new session' }), { status: 401 })
    }

    return new Response(
      JSON.stringify({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error during token refresh:', error)
    throw new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
