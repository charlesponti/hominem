import { redirect } from 'react-router';

import { createSupabaseServerClient } from '~/lib/auth.server';

export async function loader({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const { supabase, headers } = createSupabaseServerClient(request);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication, redirect to the next page or home
      return redirect(next, { headers });
    }
  }

  // If there's an error or no code, redirect to login with error
  return redirect('/login?error=Authentication failed');
}
