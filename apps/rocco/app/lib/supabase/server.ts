import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { env } from '../env'

export function createClient(request: Request) {
  const headers = new Headers()

  const supabase = createServerClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
          name: string
          value: string
        }[]
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options } of cookiesToSet) {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options ?? {}))
        }
      },
    },
  })

  return { supabase, headers }
}
