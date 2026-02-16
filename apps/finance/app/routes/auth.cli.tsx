import { type LoaderFunctionArgs, redirect } from 'react-router';

import { serverEnv } from '~/lib/env';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri');
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') ?? 'S256';
  const state = url.searchParams.get('state');
  const scope = url.searchParams.get('scope') ?? 'openid profile email';
  const provider = url.searchParams.get('provider') ?? 'google';

  if (!redirectUri || !codeChallenge || !state) {
    throw new Response('Missing required parameters', { status: 400 });
  }

  const authorizeUrl = new URL('/auth/v1/authorize', serverEnv.VITE_SUPABASE_URL);
  authorizeUrl.searchParams.set('provider', provider);
  authorizeUrl.searchParams.set('redirect_to', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('flow_type', 'pkce');
  authorizeUrl.searchParams.set('from', 'cli');

  return redirect(authorizeUrl.toString());
}

export default function AuthRoute() {
  return (
    <div>
      <h1>Authenticating...</h1>
      <p>You should be redirected for authentication, then back to the CLI.</p>
    </div>
  );
}
