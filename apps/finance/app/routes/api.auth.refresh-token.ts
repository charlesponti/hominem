import type { ActionFunctionArgs } from 'react-router';

export async function action({ request }: ActionFunctionArgs) {
  const { refreshToken } = await request.json();

  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Response(JSON.stringify({ error: 'Missing refresh token' }), { status: 400 });
  }

  try {
    const res = await fetch(new URL('/api/auth/refresh-token', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Response(JSON.stringify({ error: message || 'Refresh failed' }), { status: 401 });
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    return new Response(
      JSON.stringify({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected error during token refresh:', error);
    throw new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
