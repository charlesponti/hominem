import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { env } from '../env'

export function createClient(request: Request) {
  const headers = new Headers()
  const isProduction = process.env.NODE_ENV === 'production'
  const requestUrl = new URL(request.url)
  const isSecure = requestUrl.protocol === 'https:'

  const supabase = createServerClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
          name: string
          value: string
        }[]
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options = {} } of cookiesToSet) {
          // Ensure cookies have proper attributes for persistence across deployments
          // Merge Supabase's options first, then override with our required defaults
          const cookieOptions = {
            // Preserve any existing options from Supabase (like maxAge, expires, etc.)
            ...options,
            // Override with required defaults to ensure cookies persist across deployments
            path: typeof options.path === 'string' ? options.path : '/',
            sameSite: (['lax', 'strict', 'none'].includes(String(options.sameSite))
              ? options.sameSite
              : 'lax') as 'lax' | 'strict' | 'none',
            // Only set secure in production or when using HTTPS
            secure: typeof options.secure === 'boolean' ? options.secure : isProduction || isSecure,
          }
          headers.append(
            'Set-Cookie',
            serializeCookieHeader(
              name,
              value,
              cookieOptions as Parameters<typeof serializeCookieHeader>[2]
            )
          )
        }
      },
    },
  })

  return { supabase, headers }
}
