import type { ActionFunctionArgs } from 'react-router';

import { createSupabaseServerClient } from '@hominem/auth/server';

export async function action({ request }: ActionFunctionArgs) {
  const { accessToken } = await request.json();
  const config = {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  };
  const { supabase } = createSupabaseServerClient(request, config);

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Response(JSON.stringify({ isValid: false }), { status: 400 });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error('Token validation failed:', error?.message || 'No user found');
      throw new Response(JSON.stringify({ isValid: false }), { status: 401 });
    }

    return new Response(JSON.stringify({ isValid: true }), { status: 200 });
  } catch (error) {
    console.error('Error validating token:', error);
    throw new Response(JSON.stringify({ isValid: false }), { status: 500 });
  }
}
