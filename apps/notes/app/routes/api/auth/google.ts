import { jsonResponse } from '~/lib/utils';

import { createSupabaseServerClient } from '../../../lib/auth.server';

export async function loader({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get session for provider tokens after verifying user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const googleTokens: { access_token: string; refresh_token: string }[] = [];
  if (session?.provider_token) {
    googleTokens.push({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token ?? '',
    });
  }

  return jsonResponse({ googleTokens });
}
