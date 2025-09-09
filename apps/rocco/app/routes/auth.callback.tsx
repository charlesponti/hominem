import { redirect } from 'react-router'
import { createClient } from '~/lib/supabase/server'

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const { supabase, headers } = createClient(request)

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful authentication, redirect to the next page or dashboard
      return redirect(next, { headers })
    }
  }

  // If there's an error or no code, redirect to home with error
  return redirect('/?error=Authentication failed')
}
