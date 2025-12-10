import { getServerAuth, getServerAuthConfig } from '@hominem/auth/server'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const headers = new Headers()
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
          name: string
          value: string
        }[]
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
        }
      },
    },
  })

  return { supabase, headers }
}

export async function getServerSession(request: Request) {
  const auth = await getServerAuth(request, getServerAuthConfig())

  if (!auth.isAuthenticated || !auth.user) {
    return { user: null }
  }

  return { user: auth.user }
}

export async function requireAuth(request: Request) {
  const { user } = await getServerSession(request)

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return { user }
}
