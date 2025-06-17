import { createServerClient } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing required Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }

  // Parse cookies from request headers
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = new Map<string, string>()

  // Parse cookie string into key-value pairs
  if (cookieHeader) {
    for (const cookie of cookieHeader.split(';')) {
      const [name, ...rest] = cookie.trim().split('=')
      if (name && rest.length > 0) {
        cookies.set(name.trim(), rest.join('=').trim())
      }
    }
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Array.from(cookies.entries()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookiesToSet) {
        // In server context, we can't set cookies directly
        // This would typically be handled by the response headers
        // For React Router, cookie setting should be handled in the response
        for (const { name, value } of cookiesToSet) {
          if (value) {
            cookies.set(name, value)
          } else {
            cookies.delete(name)
          }
        }
      },
    },
  })
}

export async function getServerSession(request: Request) {
  const supabase = createSupabaseServerClient(request)

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return { user: null, session: null }
    }

    return { user: session.user, session }
  } catch (error) {
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
