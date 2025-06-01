import { createServerClient } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const cookies = request.headers.get('cookie') || ''

  return createServerClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
        return cookie ? cookie.split('=')[1] : undefined
      },
      set(name: string, value: string, options: any) {
        // For server-side rendering, we can't set cookies directly
        // This will be handled by the client-side auth state
      },
      remove(name: string, options: any) {
        // For server-side rendering, we can't remove cookies directly
        // This will be handled by the client-side auth state
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
