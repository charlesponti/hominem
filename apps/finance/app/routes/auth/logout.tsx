import { redirect } from 'react-router';

export async function action({ request }: { request: Request }) {
  // Clear auth cookies
  const headers = new Headers();
  headers.append('Set-Cookie', 'hominem_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  headers.append('Set-Cookie', 'hominem_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return redirect('/auth', { headers });
}

export async function loader() {
  return redirect('/auth');
}
