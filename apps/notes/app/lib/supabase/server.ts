import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const headers = new Headers()
  // Use non-VITE prefixed vars for server-side (VITE_ vars are for client-side only)
  // Fallback to VITE_ vars for backward compatibility during migration
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for backward compatibility)')
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
  const { supabase } = createSupabaseServerClient(request)

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return { user: null, session: null }
    }

    return { user: session.user, session }
  } catch (_error) {
    return { user: null, session: null }
  }
}

export async function requireAuth(request: Request) {
  const { user, session } = await getServerSession(request)

  if (!user || !session) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return { user, session }
}
