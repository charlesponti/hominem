import { createSupabaseServerClient } from '~/lib/auth.server'
import { redirect } from 'react-router'

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const { supabase, headers } = createSupabaseServerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const getRedirectTarget = (error: string, description: string) => {
    let target = next
    // If next is root and we have a user, go to notes to avoid home loader stripping params
    if (target === '/') {
      target = user ? '/notes' : '/auth/signin'
    }

    const sep = target.includes('?') ? '&' : '?'
    const params = new URLSearchParams({
      error: encodeURIComponent(error),
      description: encodeURIComponent(description),
    })
    return `${target}${sep}${params.toString()}`
  }

  // Handle errors from the provider
  if (errorParam) {
    return redirect(getRedirectTarget(errorParam, errorDescription ?? ''))
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful authentication, redirect to the next page or home
      return redirect(next, { headers })
    }

    if (error) {
      return redirect(getRedirectTarget('Exchange failed', error.message), { headers })
    }
  }

  // If there's no code and no error param, it's an invalid callback
  return redirect(getRedirectTarget('Authentication failed', 'No code provided'), { headers })
}
