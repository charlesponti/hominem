import { redirect } from 'react-router';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const target = `/?error=${encodeURIComponent('Google OAuth linking has been removed')}`;
  return redirect(target);
}
