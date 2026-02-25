import type { ActionFunctionArgs } from 'react-router';

export async function action({ request }: ActionFunctionArgs) {
  const { accessToken } = await request.json();

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Response(JSON.stringify({ isValid: false }), { status: 400 });
  }

  try {
    const res = await fetch(new URL('/api/auth/verify', request.url), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Response(JSON.stringify({ isValid: false }), { status: 401 });
    }

    return new Response(JSON.stringify({ isValid: true }), { status: 200 });
  } catch (error) {
    console.error('Error validating token:', error);
    throw new Response(JSON.stringify({ isValid: false }), { status: 500 });
  }
}
