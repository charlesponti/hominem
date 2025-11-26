import { createSupabaseServerClient } from '~/lib/supabase/server'
import { jsonResponse } from '~/lib/utils'

export async function loader({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return jsonResponse({ error: 'Not authenticated' }, { status: 401 })
  }

  const googleTokens: { access_token: string; refresh_token: string }[] = []
  if (session.provider_token) {
    googleTokens.push({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token ?? '',
    })
  }

  return jsonResponse({ googleTokens })
}
