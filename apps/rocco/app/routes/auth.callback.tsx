import { logger } from '@hominem/utils/logger'
import { redirect } from 'react-router'
import { createSupabaseServerClient } from '~/lib/auth.server'

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  const { supabase, headers } = createSupabaseServerClient(request)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful authentication, redirect to the next page or home
      return redirect(next, { headers })
    }

    // Log the error for debugging
    logger.error('[auth.callback] Error exchanging code for session', { error })
  }

  // Always forward headers even on error to ensure any Set-Cookie operations are preserved
  return redirect('/?error=Authentication failed', { headers })
}
