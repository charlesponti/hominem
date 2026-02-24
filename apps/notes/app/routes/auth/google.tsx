import { redirect } from 'react-router';

import { createSupabaseServerClient } from '~/lib/auth.server';

export async function loader({ request }: { request: Request }) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';
  const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const target = `/?error=${encodeURIComponent('Sign in with Apple before connecting Google')}`;
    return redirect(target, { headers });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes:
        'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Response(error.message, { status: 500 });
  }

  return redirect(data.url, { headers });
}
